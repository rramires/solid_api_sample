import { compare, hash } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryLoginAttemptTracker } from '@/repositories/in-memory/in-memory-login-attempt-tracker'
import { InMemoryPasswordChangedRegistry } from '@/repositories/in-memory/in-memory-password-changed-registry'
import { InMemoryPasswordResetRepository } from '@/repositories/in-memory/in-memory-password-reset-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { sha256 } from '@/utils/sha256'

import { InvalidResetTokenError } from './errors/invalid-reset-token-error'
import { ResetTokenExpiredError } from './errors/reset-token-expired-error'
import { ResetPasswordUseCase } from './reset-password-use-case'

let usersRepository: InMemoryUsersRepository
let resetRepository: InMemoryPasswordResetRepository
let registry: InMemoryPasswordChangedRegistry
let lockout: InMemoryLoginAttemptTracker
let sut: ResetPasswordUseCase
let userId: string

const EMAIL = 'johndoe@example.com'
const TOKEN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CODE = '123456'

async function seedReset(overrides: Partial<{ expiresAt: Date }> = {}) {
	return resetRepository.create({
		userId,
		linkTokenHash: sha256(TOKEN),
		otpCodeHash: sha256(CODE),
		expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
	})
}

describe('Reset Password Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		resetRepository = new InMemoryPasswordResetRepository()
		registry = new InMemoryPasswordChangedRegistry()
		lockout = new InMemoryLoginAttemptTracker(5, 15)
		sut = new ResetPasswordUseCase(
			usersRepository,
			resetRepository,
			registry,
			lockout,
		)

		const user = await usersRepository.create({
			username: 'johndoe',
			email: EMAIL,
			password_hash: await hash('oldpass123', 12),
		})
		userId = user.id
	})

	it('should reset the password via the link token', async () => {
		await seedReset()

		await sut.execute({ token: TOKEN, newPassword: 'newpass123' })

		const user = await usersRepository.findById(userId)
		expect(await compare('newpass123', user!.password_hash)).toBe(true)
		expect(resetRepository.items[0].used_at).not.toBeNull()
	})

	it('should reset the password via the OTP', async () => {
		await seedReset()

		await sut.execute({
			email: EMAIL,
			code: CODE,
			newPassword: 'newpass123',
		})

		const user = await usersRepository.findById(userId)
		expect(await compare('newpass123', user!.password_hash)).toBe(true)
	})

	it('should record the password change (global logout) and clear the lockout', async () => {
		// Lock the account (5 failures), confirm, then reset.
		for (let i = 0; i < 5; i++) {
			await lockout.recordFailure(EMAIL)
		}
		expect(await lockout.isLocked(EMAIL)).toBe(true)
		await seedReset()

		await sut.execute({ token: TOKEN, newPassword: 'newpass123' })

		// A token issued before now is invalidated (global logout).
		const oldIat = Math.floor(Date.now() / 1000) - 60
		expect(await registry.isInvalidated(userId, oldIat)).toBe(true)
		// Lockout cleared so the user can sign in with the new password.
		expect(await lockout.isLocked(EMAIL)).toBe(false)
	})

	it('should invalidate the record after 5 wrong OTP attempts', async () => {
		await seedReset()

		for (let i = 0; i < 5; i++) {
			await expect(
				sut.execute({
					email: EMAIL,
					code: '000000',
					newPassword: 'newpass123',
				}),
			).rejects.toBeInstanceOf(InvalidResetTokenError)
		}

		// Record is dead — even the correct code fails afterwards.
		await expect(
			sut.execute({
				email: EMAIL,
				code: CODE,
				newPassword: 'newpass123',
			}),
		).rejects.toBeInstanceOf(InvalidResetTokenError)
		expect(resetRepository.items[0].attempts).toBe(5)
	})

	it('should reject an unknown / bad link token', async () => {
		await seedReset()

		await expect(
			sut.execute({
				token: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
				newPassword: 'newpass123',
			}),
		).rejects.toBeInstanceOf(InvalidResetTokenError)
	})

	it('should reject an expired token', async () => {
		await seedReset({ expiresAt: new Date(Date.now() - 1000) })

		await expect(
			sut.execute({ token: TOKEN, newPassword: 'newpass123' }),
		).rejects.toBeInstanceOf(ResetTokenExpiredError)
	})

	it('should reject reuse of an already-used token', async () => {
		await seedReset()
		await sut.execute({ token: TOKEN, newPassword: 'newpass123' })

		await expect(
			sut.execute({ token: TOKEN, newPassword: 'another123' }),
		).rejects.toBeInstanceOf(InvalidResetTokenError)
	})
})
