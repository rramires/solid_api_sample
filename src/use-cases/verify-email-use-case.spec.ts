import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryEmailVerificationRepository } from '@/repositories/in-memory/in-memory-email-verification-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { AlreadyVerifiedError } from './errors/already-verified-error'
import { InvalidVerificationTokenError } from './errors/invalid-verification-token-error'
import { VerificationTokenExpiredError } from './errors/verification-token-expired-error'
import { VerifyEmailUseCase } from './verify-email-use-case'

let usersRepository: InMemoryUsersRepository
let verificationRepository: InMemoryEmailVerificationRepository
let sut: VerifyEmailUseCase
let userId: string

describe('Verify Email Use Case (OTP attempts)', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		verificationRepository = new InMemoryEmailVerificationRepository()
		sut = new VerifyEmailUseCase(usersRepository, verificationRepository)

		const user = await usersRepository.create({
			username: 'johndoe',
			email: 'johndoe@example.com',
			password_hash: await hash('abc12345', 12),
		})
		userId = user.id

		await verificationRepository.create({
			userId,
			linkToken: 'link-token',
			otpCode: '123456',
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		})
	})

	it('should verify with the correct OTP', async () => {
		const result = await sut.execute({ userId, code: '123456' })

		expect(result.userId).toEqual(userId)
		const user = await usersRepository.findById(userId)
		expect(user?.is_verified).toBe(true)
	})

	it('should verify via the link token', async () => {
		const result = await sut.execute({ token: 'link-token' })

		expect(result.userId).toEqual(userId)
		const user = await usersRepository.findById(userId)
		expect(user?.is_verified).toBe(true)
	})

	it('should reject an unknown link token', async () => {
		await expect(sut.execute({ token: 'nope' })).rejects.toBeInstanceOf(
			InvalidVerificationTokenError,
		)
	})

	it('should reject an expired token', async () => {
		await verificationRepository.create({
			userId,
			linkToken: 'expired-token',
			otpCode: '999999',
			expiresAt: new Date(Date.now() - 1000),
		})

		await expect(
			sut.execute({ token: 'expired-token' }),
		).rejects.toBeInstanceOf(VerificationTokenExpiredError)
	})

	it('should reject an already-used token', async () => {
		await sut.execute({ token: 'link-token' })
		// User is now verified — re-running the same token hits the verified guard
		// before the used guard, so unverify to isolate the used-record path.
		await usersRepository.update(userId, { is_verified: false })

		await expect(
			sut.execute({ token: 'link-token' }),
		).rejects.toBeInstanceOf(InvalidVerificationTokenError)
	})

	it('should reject when the user is already verified', async () => {
		await usersRepository.update(userId, { is_verified: true })

		await expect(
			sut.execute({ token: 'link-token' }),
		).rejects.toBeInstanceOf(AlreadyVerifiedError)
	})

	it('should invalidate the record after 5 wrong OTP attempts', async () => {
		for (let i = 0; i < 5; i++) {
			await expect(
				sut.execute({ userId, code: '000000' }),
			).rejects.toBeInstanceOf(InvalidVerificationTokenError)
		}

		// The record is now dead — even the correct OTP no longer works.
		await expect(
			sut.execute({ userId, code: '123456' }),
		).rejects.toBeInstanceOf(InvalidVerificationTokenError)

		const record = await verificationRepository.findLatestByUserId(userId)
		expect(record?.attempts).toBe(5)
		expect(record?.used_at).not.toBeNull()
	})
})
