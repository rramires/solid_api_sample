import { EmailChange } from '@/prisma-client'
import { IEmailChangeRepository } from '@/repositories/i-email-change-repository'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { InvalidVerificationTokenError } from './errors/invalid-verification-token-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { VerificationTokenExpiredError } from './errors/verification-token-expired-error'

type ConfirmByLink = { token: string }
type ConfirmByOtp = { userId: string; code: string }

type ConfirmEmailChangeUseCaseRequest = ConfirmByLink | ConfirmByOtp

// 6-digit OTP = 1M combinations; cap wrong guesses so it can't be brute-forced.
const MAX_OTP_ATTEMPTS = 5

export class ConfirmEmailChangeUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private emailChangeRepository: IEmailChangeRepository,
	) {}

	async execute(
		input: ConfirmEmailChangeUseCaseRequest,
	): Promise<{ userId: string; newEmail: string }> {
		let record: EmailChange | null
		let userId: string

		if ('token' in input) {
			record = await this.emailChangeRepository.findByLinkToken(
				input.token,
			)
			if (!record) {
				throw new InvalidVerificationTokenError()
			}
			userId = record.user_id
		} else {
			userId = input.userId
			const active =
				await this.emailChangeRepository.findLatestByUserId(userId)
			if (!active) {
				throw new InvalidVerificationTokenError()
			}
			// Count the attempt only against a still-usable record; a wrong code
			// invalidates the record once the cap is reached.
			const usable = !active.used_at && active.expires_at >= new Date()
			if (usable && active.otp_code !== input.code) {
				const attemptsAfter = active.attempts + 1
				await this.emailChangeRepository.incrementAttempts(active.id)
				if (attemptsAfter >= MAX_OTP_ATTEMPTS) {
					await this.emailChangeRepository.markUsed(active.id)
				}
				throw new InvalidVerificationTokenError()
			}
			record = active
		}

		const user = await this.usersRepository.findById(userId)
		if (!user) {
			throw new ResourceNotFoundError()
		}

		if (record.used_at) {
			throw new InvalidVerificationTokenError()
		}

		if (record.expires_at < new Date()) {
			throw new VerificationTokenExpiredError()
		}

		// Re-check uniqueness at confirm time (TOCTOU): the address may have been
		// taken by someone else between request and confirmation.
		const owner = await this.usersRepository.findByEmail(record.new_email)
		if (owner && owner.id !== userId) {
			throw new UserAlreadyExistsError()
		}

		// Clicking the link / entering the code proves control of the new address,
		// so the account becomes verified again.
		await this.emailChangeRepository.markUsed(record.id)
		await this.usersRepository.update(userId, {
			email: record.new_email,
			is_verified: true,
		})

		return { userId, newEmail: record.new_email }
	}
}
