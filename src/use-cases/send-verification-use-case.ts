import { randomInt, randomUUID } from 'node:crypto'

import { env } from '@/env'
import { IEmailProvider } from '@/lib/email/i-email-provider'
import { IEmailVerificationRepository } from '@/repositories/i-email-verification-repository'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface SendVerificationUseCaseRequest {
	userId: string
}

export class SendVerificationUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private emailVerificationRepository: IEmailVerificationRepository,
		private emailProvider: IEmailProvider,
	) {}

	async execute({ userId }: SendVerificationUseCaseRequest): Promise<void> {
		const user = await this.usersRepository.findById(userId)
		if (!user) throw new ResourceNotFoundError()

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
