import { EmailVerification } from '@/prisma-client'
import { IEmailVerificationRepository } from '@/repositories/i-email-verification-repository'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { AlreadyVerifiedError } from './errors/already-verified-error'
import { InvalidVerificationTokenError } from './errors/invalid-verification-token-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { VerificationTokenExpiredError } from './errors/verification-token-expired-error'

type VerifyByLink = { token: string }
type VerifyByOtp = { userId: string; code: string }

type VerifyEmailUseCaseRequest = VerifyByLink | VerifyByOtp

// 6-digit OTP = 1M combinations; cap wrong guesses so it can't be brute-forced
// under the global rate limit.
const MAX_OTP_ATTEMPTS = 5

export class VerifyEmailUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private emailVerificationRepository: IEmailVerificationRepository,
	) {}

	async execute(
		input: VerifyEmailUseCaseRequest,
	): Promise<{ userId: string }> {
		let record: EmailVerification | null
		let userId: string

		if ('token' in input) {
			record = await this.emailVerificationRepository.findByLinkToken(
				input.token,
			)
			if (!record) {
				throw new InvalidVerificationTokenError()
			}
			userId = record.user_id
		} else {
			userId = input.userId
			const active =
				await this.emailVerificationRepository.findLatestByUserId(
					userId,
				)
			if (!active) {
				throw new InvalidVerificationTokenError()
			}
			// Count the attempt only against a still-usable record; a wrong code
			// invalidates the record once the cap is reached (used/expired records
			// fall through to the shared checks below).
			const usable = !active.used_at && active.expires_at >= new Date()
			if (usable && active.otp_code !== input.code) {
				// Compute the post-increment count up front: the in-memory repo
				// mutates `active` by reference, so re-reading active.attempts after
				// the call would double-count.
				const attemptsAfter = active.attempts + 1
				await this.emailVerificationRepository.incrementAttempts(
					active.id,
				)
				if (attemptsAfter >= MAX_OTP_ATTEMPTS) {
					await this.emailVerificationRepository.markUsed(active.id)
				}
				throw new InvalidVerificationTokenError()
			}
			record = active
		}

		const user = await this.usersRepository.findById(userId)
		if (!user) {
			throw new ResourceNotFoundError()
		}

		if (user.is_verified) {
			throw new AlreadyVerifiedError()
		}

		if (record.used_at) {
			throw new InvalidVerificationTokenError()
		}

		if (record.expires_at < new Date()) {
			throw new VerificationTokenExpiredError()
		}

		await this.emailVerificationRepository.markUsed(record.id)
		await this.usersRepository.update(userId, { is_verified: true })

		// Return the resolved user so the caller can refresh the verified cache.
		return { userId }
	}
}
