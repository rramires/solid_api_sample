import { hash } from 'bcryptjs'

import { PasswordReset } from '@/prisma-client'
import { ILoginAttemptTracker } from '@/repositories/i-login-attempt-tracker'
import { IPasswordChangedRegistry } from '@/repositories/i-password-changed-registry'
import { IPasswordResetRepository } from '@/repositories/i-password-reset-repository'
import { IUsersRepository } from '@/repositories/i-users-repository'
import { sha256 } from '@/utils/sha256'

import { InvalidResetTokenError } from './errors/invalid-reset-token-error'
import { ResetTokenExpiredError } from './errors/reset-token-expired-error'

type ResetByLink = { token: string; newPassword: string }
type ResetByOtp = { email: string; code: string; newPassword: string }

type ResetPasswordUseCaseRequest = ResetByLink | ResetByOtp

// 6-digit OTP cap, same rationale as email verification.
const MAX_OTP_ATTEMPTS = 5

export class ResetPasswordUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private passwordResetRepository: IPasswordResetRepository,
		private passwordChangedRegistry: IPasswordChangedRegistry,
		private loginAttemptTracker: ILoginAttemptTracker,
	) {}

	async execute(input: ResetPasswordUseCaseRequest): Promise<void> {
		let record: PasswordReset | null
		let userId: string

		if ('token' in input) {
			// Link path: the 128-bit token is not brute-forceable, so no attempt
			// counting. Look it up by hash.
			record = await this.passwordResetRepository.findByLinkTokenHash(
				sha256(input.token),
			)
			if (!record) {
				throw new InvalidResetTokenError()
			}
			userId = record.user_id
		} else {
			// OTP path: resolve the user, then compare the code against the active
			// record. Every failure throws the same generic error.
			const user = await this.usersRepository.findByEmail(input.email)
			if (!user) {
				throw new InvalidResetTokenError()
			}
			userId = user.id

			const active =
				await this.passwordResetRepository.findActiveByUserId(userId)
			if (!active) {
				throw new InvalidResetTokenError()
			}
			if (active.otp_code_hash !== sha256(input.code)) {
				// Capture the count before incrementing (the in-memory repo mutates
				// by reference) so the cap fires on exactly the 5th wrong code.
				const attemptsAfter = active.attempts + 1
				await this.passwordResetRepository.incrementAttempts(active.id)
				if (attemptsAfter >= MAX_OTP_ATTEMPTS) {
					await this.passwordResetRepository.markUsed(active.id)
				}
				throw new InvalidResetTokenError()
			}
			record = active
		}

		// Shared validity checks (the link path lands here directly).
		if (record.used_at) {
			throw new InvalidResetTokenError()
		}
		if (record.expires_at < new Date()) {
			throw new ResetTokenExpiredError()
		}

		const password_hash = await hash(input.newPassword, 12)
		const changedAt = new Date()

		await this.usersRepository.update(userId, {
			password_hash,
			password_changed_at: changedAt,
		})
		await this.passwordResetRepository.markUsed(record.id)
		// Burn any sibling resets so a second link/OTP can't be replayed.
		await this.passwordResetRepository.invalidateAllByUserId(userId)
		// Global logout: every token issued before now is rejected.
		await this.passwordChangedRegistry.recordChange(userId, changedAt)

		// Clear any login lockout so the user can sign in with the new password.
		const user = await this.usersRepository.findById(userId)
		if (user) {
			await this.loginAttemptTracker.clearAttempts(user.email)
		}
	}
}
