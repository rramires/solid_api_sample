import { randomInt, randomUUID } from 'node:crypto'

import { env } from '@/env'
import { IEmailProvider } from '@/lib/email/i-email-provider'
import { IEmailChangeRepository } from '@/repositories/i-email-change-repository'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { ResendCooldownError } from './errors/resend-cooldown-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'

interface RequestEmailChangeUseCaseRequest {
	userId: string
	newEmail: string
}

// Minimum gap between two change-confirmation emails — blunts email-bombing.
const RESEND_COOLDOWN_SECONDS = 60

export class RequestEmailChangeUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private emailChangeRepository: IEmailChangeRepository,
		private emailProvider: IEmailProvider,
	) {}

	async execute({
		userId,
		newEmail,
	}: RequestEmailChangeUseCaseRequest): Promise<void> {
		const user = await this.usersRepository.findById(userId)
		if (!user) {
			throw new ResourceNotFoundError()
		}

		// Uniqueness: refuse if the address is already in use — by anyone,
		// including the user themselves (no point "changing" to the current one).
		const owner = await this.usersRepository.findByEmail(newEmail)
		if (owner) {
			throw new UserAlreadyExistsError()
		}

		// Cooldown: refuse while a fresh, still-usable request exists.
		const latest =
			await this.emailChangeRepository.findLatestByUserId(userId)
		if (
			latest &&
			!latest.used_at &&
			latest.expires_at >= new Date() &&
			Date.now() - latest.created_at.getTime() <
				RESEND_COOLDOWN_SECONDS * 1000
		) {
			throw new ResendCooldownError(RESEND_COOLDOWN_SECONDS)
		}

		await this.emailChangeRepository.deleteExpiredByUserId(userId)

		const linkToken = randomUUID()
		const otpCode = String(randomInt(0, 1_000_000)).padStart(6, '0')
		const expiresAt = new Date(
			Date.now() + env.VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000,
		)

		await this.emailChangeRepository.create({
			userId,
			newEmail,
			linkToken,
			otpCode,
			expiresAt,
		})

		// Confirmation to the NEW address (proves control)...
		await this.emailProvider.sendEmailChangeConfirmation({
			to: newEmail,
			linkToken,
			otpCode,
			expiresInHours: env.VERIFICATION_EXPIRES_HOURS,
		})
		// ...and an anti-hijack alert to the OLD address (still valid until confirm).
		await this.emailProvider.sendEmailChangeAlert({
			to: user.email,
			newEmail,
		})
	}
}
