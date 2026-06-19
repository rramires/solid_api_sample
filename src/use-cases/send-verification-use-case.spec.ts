import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { IEmailProvider } from '@/lib/email/i-email-provider'
import { InMemoryEmailVerificationRepository } from '@/repositories/in-memory/in-memory-email-verification-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { ResendCooldownError } from './errors/resend-cooldown-error'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { SendVerificationUseCase } from './send-verification-use-case'

class FakeEmailProvider implements IEmailProvider {
	public sent = 0
	async sendVerificationEmail() {
		this.sent += 1
	}
	async sendPasswordResetEmail() {}
	async sendEmailChangeConfirmation() {}
	async sendEmailChangeAlert() {}
}

let usersRepository: InMemoryUsersRepository
let verificationRepository: InMemoryEmailVerificationRepository
let emailProvider: FakeEmailProvider
let sut: SendVerificationUseCase
let userId: string

describe('Send Verification Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		verificationRepository = new InMemoryEmailVerificationRepository()
		emailProvider = new FakeEmailProvider()
		sut = new SendVerificationUseCase(
			usersRepository,
			verificationRepository,
			emailProvider,
		)

		const user = await usersRepository.create({
			username: 'johndoe',
			email: 'johndoe@example.com',
			password_hash: await hash('abc12345', 12),
		})
		userId = user.id
	})

	it('should send a verification email', async () => {
		await sut.execute({ userId })

		expect(emailProvider.sent).toBe(1)
	})

	it('should reject an unknown user', async () => {
		await expect(sut.execute({ userId: 'nope' })).rejects.toBeInstanceOf(
			ResourceNotFoundError,
		)
	})

	it('should refuse a resend within the cooldown window', async () => {
		await sut.execute({ userId })

		await expect(sut.execute({ userId })).rejects.toBeInstanceOf(
			ResendCooldownError,
		)
		expect(emailProvider.sent).toBe(1)
	})
})
