import { beforeEach, describe, expect, it } from 'vitest'

import { IEmailProvider } from '@/lib/email/i-email-provider'
import { InMemoryEmailChangeRepository } from '@/repositories/in-memory/in-memory-email-change-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { ResendCooldownError } from './errors/resend-cooldown-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { RequestEmailChangeUseCase } from './request-email-change-use-case'

class CapturingEmailProvider implements IEmailProvider {
	public confirmations: { to: string; linkToken: string; otpCode: string }[] =
		[]
	public alerts: { to: string; newEmail: string }[] = []
	async sendVerificationEmail() {}
	async sendPasswordResetEmail() {}
	async sendEmailChangeConfirmation(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInHours: number
	}) {
		this.confirmations.push({
			to: params.to,
			linkToken: params.linkToken,
			otpCode: params.otpCode,
		})
	}
	async sendEmailChangeAlert(params: { to: string; newEmail: string }) {
		this.alerts.push({ to: params.to, newEmail: params.newEmail })
	}
}

let usersRepository: InMemoryUsersRepository
let changeRepository: InMemoryEmailChangeRepository
let emailProvider: CapturingEmailProvider
let sut: RequestEmailChangeUseCase
let userId: string

describe('Request Email Change Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		changeRepository = new InMemoryEmailChangeRepository()
		emailProvider = new CapturingEmailProvider()
		sut = new RequestEmailChangeUseCase(
			usersRepository,
			changeRepository,
			emailProvider,
		)

		const user = await usersRepository.create({
			username: 'johndoe',
			email: 'john@example.com',
			password_hash: 'hash',
			is_verified: true,
		})
		userId = user.id
	})

	it('should create a request, confirm to the NEW email and alert the OLD one', async () => {
		await sut.execute({ userId, newEmail: 'new@example.com' })

		expect(changeRepository.items).toHaveLength(1)
		expect(changeRepository.items[0].new_email).toEqual('new@example.com')

		expect(emailProvider.confirmations).toHaveLength(1)
		expect(emailProvider.confirmations[0].to).toEqual('new@example.com')

		expect(emailProvider.alerts).toHaveLength(1)
		expect(emailProvider.alerts[0].to).toEqual('john@example.com')
		expect(emailProvider.alerts[0].newEmail).toEqual('new@example.com')

		// The user's proven email is NOT touched yet (pattern A).
		const fresh = await usersRepository.findById(userId)
		expect(fresh?.email).toEqual('john@example.com')
	})

	it('should reject an email already taken by another user', async () => {
		await usersRepository.create({
			username: 'other',
			email: 'taken@example.com',
			password_hash: 'hash',
		})

		await expect(
			sut.execute({ userId, newEmail: 'taken@example.com' }),
		).rejects.toBeInstanceOf(UserAlreadyExistsError)
	})

	it('should reject changing to the current email', async () => {
		await expect(
			sut.execute({ userId, newEmail: 'john@example.com' }),
		).rejects.toBeInstanceOf(UserAlreadyExistsError)
	})

	it('should enforce a cooldown between requests', async () => {
		await sut.execute({ userId, newEmail: 'new@example.com' })

		await expect(
			sut.execute({ userId, newEmail: 'new2@example.com' }),
		).rejects.toBeInstanceOf(ResendCooldownError)
	})

	it('should throw ResourceNotFoundError for an unknown user', async () => {
		await expect(
			sut.execute({ userId: 'non-existent', newEmail: 'x@example.com' }),
		).rejects.toBeInstanceOf(ResourceNotFoundError)
	})
})
