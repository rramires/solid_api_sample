import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { IEmailProvider } from '@/lib/email/i-email-provider'
import { InMemoryPasswordResetRepository } from '@/repositories/in-memory/in-memory-password-reset-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { sha256 } from '@/utils/sha256'

import { ForgotPasswordUseCase } from './forgot-password-use-case'

class CapturingEmailProvider implements IEmailProvider {
	public resets: { to: string; linkToken: string; otpCode: string }[] = []
	async sendVerificationEmail() {}
	async sendEmailChangeConfirmation() {}
	async sendEmailChangeAlert() {}
	async sendPasswordResetEmail(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInMinutes: number
	}) {
		this.resets.push({
			to: params.to,
			linkToken: params.linkToken,
			otpCode: params.otpCode,
		})
	}
}

let usersRepository: InMemoryUsersRepository
let resetRepository: InMemoryPasswordResetRepository
let emailProvider: CapturingEmailProvider
let sut: ForgotPasswordUseCase

describe('Forgot Password Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		resetRepository = new InMemoryPasswordResetRepository()
		emailProvider = new CapturingEmailProvider()
		sut = new ForgotPasswordUseCase(
			usersRepository,
			resetRepository,
			emailProvider,
		)

		await usersRepository.create({
			username: 'johndoe',
			email: 'johndoe@example.com',
			password_hash: await hash('abc12345', 12),
		})
	})

	it('should stay silent for an unknown email (no record, no email)', async () => {
		await sut.execute({ email: 'nobody@example.com' })

		expect(resetRepository.items).toHaveLength(0)
		expect(emailProvider.resets).toHaveLength(0)
	})

	it('should create a reset and send the raw token/code for a known email', async () => {
		await sut.execute({ email: 'johndoe@example.com' })

		expect(emailProvider.resets).toHaveLength(1)
		expect(resetRepository.items).toHaveLength(1)

		// Only hashes are persisted — never the raw values.
		const sent = emailProvider.resets[0]
		const stored = resetRepository.items[0]
		expect(stored.link_token_hash).toEqual(sha256(sent.linkToken))
		expect(stored.otp_code_hash).toEqual(sha256(sent.otpCode))
		expect(stored.link_token_hash).not.toEqual(sent.linkToken)
	})

	it('should not send a second email within the cooldown window', async () => {
		await sut.execute({ email: 'johndoe@example.com' })
		await sut.execute({ email: 'johndoe@example.com' })

		expect(emailProvider.resets).toHaveLength(1)
		expect(resetRepository.items).toHaveLength(1)
	})
})
