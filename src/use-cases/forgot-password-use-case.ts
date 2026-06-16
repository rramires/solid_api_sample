import { randomInt, randomUUID } from 'node:crypto'

import { env } from '@/env'
import { IEmailProvider } from '@/lib/email/i-email-provider'
import { IPasswordResetRepository } from '@/repositories/i-password-reset-repository'
import { IUsersRepository } from '@/repositories/i-users-repository'
import { sha256 } from '@/utils/sha256'

interface ForgotPasswordUseCaseRequest {
	email: string
}

// Minimum gap between two reset emails — blunts email-bombing.
const RESET_COOLDOWN_SECONDS = 60

export class ForgotPasswordUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private passwordResetRepository: IPasswordResetRepository,
		private emailProvider: IEmailProvider,
	) {}

	// Always resolves the same way (void) whether or not the email exists — the
	// controller answers 202 either way (anti-enumeration). The token/OTP and
	// their hashes are generated unconditionally so both paths do similar work.
	async execute({ email }: ForgotPasswordUseCaseRequest): Promise<void> {
		const linkToken = randomUUID()
		const otpCode = String(randomInt(0, 1_000_000)).padStart(6, '0')
		const linkTokenHash = sha256(linkToken)
		const otpCodeHash = sha256(otpCode)

		const user = await this.usersRepository.findByEmail(email)
		if (!user) {
			// Unknown email: nothing persisted or sent, silent return.
			return
		}

		// Cooldown: a fresh active reset already exists → silent return (no oracle).
		const active = await this.passwordResetRepository.findActiveByUserId(
			user.id,
		)
		if (
			active &&
			Date.now() - active.created_at.getTime() <
				RESET_COOLDOWN_SECONDS * 1000
		) {
			return
		}

		await this.passwordResetRepository.deleteExpiredByUserId(user.id)

		const expiresAt = new Date(
			Date.now() + env.RESET_EXPIRES_MINUTES * 60 * 1000,
		)
		await this.passwordResetRepository.create({
			userId: user.id,
			linkTokenHash,
			otpCodeHash,
			expiresAt,
		})

		await this.emailProvider.sendPasswordResetEmail({
			to: user.email,
			linkToken,
			otpCode,
			expiresInMinutes: env.RESET_EXPIRES_MINUTES,
		})
	}
}
