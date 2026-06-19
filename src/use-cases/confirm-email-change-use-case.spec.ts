import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryEmailChangeRepository } from '@/repositories/in-memory/in-memory-email-change-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { ConfirmEmailChangeUseCase } from './confirm-email-change-use-case'
import { InvalidVerificationTokenError } from './errors/invalid-verification-token-error'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { VerificationTokenExpiredError } from './errors/verification-token-expired-error'

let usersRepository: InMemoryUsersRepository
let changeRepository: InMemoryEmailChangeRepository
let sut: ConfirmEmailChangeUseCase
let userId: string

const HOUR = 60 * 60 * 1000

async function makeRecord(
	overrides: Partial<{
		linkToken: string
		otpCode: string
		newEmail: string
		expiresAt: Date
	}> = {},
) {
	return changeRepository.create({
		userId,
		newEmail: overrides.newEmail ?? 'new@example.com',
		linkToken: overrides.linkToken ?? 'link-token',
		otpCode: overrides.otpCode ?? '123456',
		expiresAt: overrides.expiresAt ?? new Date(Date.now() + HOUR),
	})
}

describe('Confirm Email Change Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		changeRepository = new InMemoryEmailChangeRepository()
		sut = new ConfirmEmailChangeUseCase(usersRepository, changeRepository)

		const user = await usersRepository.create({
			username: 'johndoe',
			email: 'old@example.com',
			password_hash: 'hash',
			is_verified: false,
		})
		userId = user.id
	})

	it('should swap the email and verify the account via link', async () => {
		await makeRecord({ linkToken: 'link-1', newEmail: 'new@example.com' })

		const result = await sut.execute({ token: 'link-1' })

		expect(result).toEqual({ userId, newEmail: 'new@example.com' })
		const fresh = await usersRepository.findById(userId)
		expect(fresh?.email).toEqual('new@example.com')
		expect(fresh?.is_verified).toBe(true)
		expect(changeRepository.items[0].used_at).not.toBeNull()
	})

	it('should confirm via OTP', async () => {
		await makeRecord({ otpCode: '654321', newEmail: 'otp@example.com' })

		const result = await sut.execute({ userId, code: '654321' })

		expect(result.newEmail).toEqual('otp@example.com')
		const fresh = await usersRepository.findById(userId)
		expect(fresh?.email).toEqual('otp@example.com')
	})

	it('should reject a wrong OTP and count the attempt', async () => {
		const record = await makeRecord({ otpCode: '654321' })

		await expect(
			sut.execute({ userId, code: '000000' }),
		).rejects.toBeInstanceOf(InvalidVerificationTokenError)

		const fresh = changeRepository.items.find((r) => r.id === record.id)
		expect(fresh?.attempts).toEqual(1)
	})

	it('should invalidate the record after too many wrong OTPs', async () => {
		await makeRecord({ otpCode: '654321' })

		for (let i = 0; i < 5; i++) {
			await expect(
				sut.execute({ userId, code: '000000' }),
			).rejects.toBeInstanceOf(InvalidVerificationTokenError)
		}

		// Capped → record marked used; even the right code is now invalid.
		await expect(
			sut.execute({ userId, code: '654321' }),
		).rejects.toBeInstanceOf(InvalidVerificationTokenError)
	})

	it('should reject an expired record', async () => {
		await makeRecord({
			linkToken: 'link-exp',
			expiresAt: new Date(Date.now() - HOUR),
		})

		await expect(sut.execute({ token: 'link-exp' })).rejects.toBeInstanceOf(
			VerificationTokenExpiredError,
		)
	})

	it('should reject an already-used record', async () => {
		const record = await makeRecord({ linkToken: 'link-used' })
		await changeRepository.markUsed(record.id)

		await expect(
			sut.execute({ token: 'link-used' }),
		).rejects.toBeInstanceOf(InvalidVerificationTokenError)
	})

	it('should re-check uniqueness at confirm time (TOCTOU)', async () => {
		await makeRecord({
			linkToken: 'link-race',
			newEmail: 'race@example.com',
		})
		// Someone else grabbed the address between request and confirm.
		await usersRepository.create({
			username: 'racer',
			email: 'race@example.com',
			password_hash: 'hash',
		})

		await expect(
			sut.execute({ token: 'link-race' }),
		).rejects.toBeInstanceOf(UserAlreadyExistsError)
	})

	it('should reject an unknown link token', async () => {
		await expect(
			sut.execute({ token: 'does-not-exist' }),
		).rejects.toBeInstanceOf(InvalidVerificationTokenError)
	})
})
