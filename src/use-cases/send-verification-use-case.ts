import { randomInt, randomUUID } from 'node:crypto'

import { env } from '@/env'
import { IEmailProvider } from '@/lib/email/i-email-provider'
import { IEmailVerificationRepository } from '@/repositories/i-email-verification-repository'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { ResendCooldownError } from './errors/resend-cooldown-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface SendVerificationUseCaseRequest {
	userId: string
}

// Minimum gap between two verification emails — blunts email-bombing once a
// real provider is plugged in.
const RESEND_COOLDOWN_SECONDS = 60

export class SendVerificationUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private emailVerificationRepository: IEmailVerificationRepository,
		private emailProvider: IEmailProvider,
	) {}

	async execute({ userId }: SendVerificationUseCaseRequest): Promise<void> {
		const user = await this.usersRepository.findById(userId)
		if (!user) {
			throw new ResourceNotFoundError()
		}

		// Cooldown: refuse a new email while a fresh, still-usable record exists.
		const latest =
			await this.emailVerificationRepository.findLatestByUserId(userId)
		if (
			latest &&
			!latest.used_at &&
			latest.expires_at >= new Date() &&
			Date.now() - latest.created_at.getTime() <
				RESEND_COOLDOWN_SECONDS * 1000
		) {
			throw new ResendCooldownError(RESEND_COOLDOWN_SECONDS)
		}

		// Remove expired records to keep the table tidy.
		await this.emailVerificationRepository.deleteExpiredByUserId(userId)

		const linkToken = randomUUID()
		// 6-digit OTP padded to always have 6 chars.
		const otpCode = String(randomInt(0, 1_000_000)).padStart(6, '0')
		const expiresAt = new Date(
			Date.now() + env.VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000,
		)

		await this.emailVerificationRepository.create({
			userId,
			linkToken,
			otpCode,
			expiresAt,
		})

		await this.emailProvider.sendVerificationEmail({
			to: user.email,
			linkToken,
			otpCode,
			expiresInHours: env.VERIFICATION_EXPIRES_HOURS,
		})
	}
}
