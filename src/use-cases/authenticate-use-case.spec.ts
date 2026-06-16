import { hash } from 'bcryptjs'
import { describe, expect, it } from 'vitest'
import { beforeEach } from 'vitest'

import { InMemoryLoginAttemptTracker } from '@/repositories/in-memory/in-memory-login-attempt-tracker'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { AuthenticateUseCase } from './authenticate-use-case'
import { InvalidCredentialsError } from './errors/invalid-credentials-error'
import { TooManyAttemptsError } from './errors/too-many-attempts-error'

let usersRepository: InMemoryUsersRepository
let loginAttemptTracker: InMemoryLoginAttemptTracker
const newUser = {
	username: 'johndoe',
	email: 'jhondoe@email.com',
	password: 'abc123',
}
let userId: string
let sut: AuthenticateUseCase

describe('Authenticate Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		loginAttemptTracker = new InMemoryLoginAttemptTracker()
		const createdUser = await usersRepository.create({
			username: newUser.username,
			email: newUser.email,
			password_hash: await hash(newUser.password, 12),
		})
		userId = createdUser.id

		sut = new AuthenticateUseCase(usersRepository, loginAttemptTracker)
	})

	it('should be able to authenticate by email', async () => {
		// authenticate
		const { user } = await sut.execute({
			identifier: newUser.email,
			password: newUser.password,
		})
		expect(user.id).toEqual(expect.any(String))
	})

	it('should be able to authenticate by username (case-insensitive)', async () => {
		const { user } = await sut.execute({
			identifier: newUser.username.toUpperCase(),
			password: newUser.password,
		})
		expect(user.id).toEqual(userId)
	})

	it('should not be able to authenticate with unknown identifier', async () => {
		await expect(
			sut.execute({
				identifier: 'wrong@email.com',
				password: newUser.password,
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError)
		await expect(
			sut.execute({
				identifier: 'ghostuser',
				password: newUser.password,
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError)
	})

	it('should not be able to authenticate (password)', async () => {
		// authenticate with wrong password
		await expect(
			sut.execute({
				identifier: newUser.email,
				password: 'wrongPassword',
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError)
	})

	it('should lock account after maximum failed attempts', async () => {
		// Exhaust all attempts (each throws InvalidCredentialsError).
		for (let i = 0; i < 5; i++) {
			await expect(
				sut.execute({ identifier: newUser.email, password: 'wrong' }),
			).rejects.toBeInstanceOf(InvalidCredentialsError)
		}
		// Next attempt must be blocked before bcrypt even runs.
		await expect(
			sut.execute({ identifier: newUser.email, password: 'wrong' }),
		).rejects.toBeInstanceOf(TooManyAttemptsError)
	})

	it('should lock by account, not by the identifier used', async () => {
		// Five failures via the email...
		for (let i = 0; i < 5; i++) {
			await expect(
				sut.execute({ identifier: newUser.email, password: 'wrong' }),
			).rejects.toBeInstanceOf(InvalidCredentialsError)
		}
		// ...must also block a login attempt made via the username (same account).
		await expect(
			sut.execute({
				identifier: newUser.username,
				password: newUser.password,
			}),
		).rejects.toBeInstanceOf(TooManyAttemptsError)
	})

	it('should not allow login while locked even with correct password', async () => {
		// Lock the account directly via the tracker (keyed by account id).
		for (let i = 0; i < 5; i++) {
			await loginAttemptTracker.recordFailure(userId)
		}
		await expect(
			sut.execute({
				identifier: newUser.email,
				password: newUser.password,
			}),
		).rejects.toBeInstanceOf(TooManyAttemptsError)
	})

	it('should clear lockout counter on successful login', async () => {
		// Record some (non-locking) failures.
		await loginAttemptTracker.recordFailure(userId)
		await loginAttemptTracker.recordFailure(userId)

		// Successful login should clear the counter.
		const { user } = await sut.execute({
			identifier: newUser.email,
			password: newUser.password,
		})
		expect(user.id).toEqual(expect.any(String))

		// Subsequent authentication must still work (counter was cleared).
		await expect(
			sut.execute({
				identifier: newUser.email,
				password: newUser.password,
			}),
		).resolves.toBeDefined()
	})
})
