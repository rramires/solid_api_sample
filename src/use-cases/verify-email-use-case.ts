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

export class VerifyEmailUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private emailVerificationRepository: IEmailVerificationRepository,
	) {}

	async execute(input: VerifyEmailUseCaseRequest): Promise<void> {
		let record: EmailVerification | null
		let userId: string

		if ('token' in input) {
			record = await this.emailVerificationRepository.findByLinkToken(
				input.token,
			)
			if (!record) {throw new InvalidVerificationTokenError()}
			userId = record.user_id
		} else {
			userId = input.userId
			record = await this.emailVerificationRepository.findByOtpCode(
				userId,
				input.code,
			)
			if (!record) {throw new InvalidVerificationTokenError()}
		}

		const user = await this.usersRepository.findById(userId)
		if (!user) {throw new ResourceNotFoundError()}

		if (user.is_verified) {throw new AlreadyVerifiedError()}

		if (record.used_at) {throw new InvalidVerificationTokenError()}

		if (record.expires_at < new Date()) {throw new VerificationTokenExpiredError()}

		await this.emailVerificationRepository.markUsed(record.id)
		await this.usersRepository.update(userId, { is_verified: true })
	}
}
