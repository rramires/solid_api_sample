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
	name: 'Jhon Doe',
	email: 'jhondoe@email.com',
	password: 'abc123',
}
let sut: AuthenticateUseCase

describe('Authenticate Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		loginAttemptTracker = new InMemoryLoginAttemptTracker()
		await usersRepository.create({
			name: newUser.name,
			email: newUser.email,
			password_hash: await hash(newUser.password, 12),
		})

		sut = new AuthenticateUseCase(usersRepository, loginAttemptTracker)
	})

	it('should be able to authenticate', async () => {
		// authenticate
		const { user } = await sut.execute({
			email: newUser.email,
			password: newUser.password,
		})
		expect(user.id).toEqual(expect.any(String))
	})

	it('should not be able to authenticate with wrong email', async () => {
		// authenticate with wrong email
		await expect(
			sut.execute({
				email: 'wrong@email.com',
				password: newUser.password,
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError)
	})

	it('should not be able to authenticate (password)', async () => {
		// authenticate with wrong password
		await expect(
			sut.execute({
				email: newUser.email,
				password: 'wrongPassword',
			}),
		).rejects.toBeInstanceOf(InvalidCredentialsError)
	})

	it('should lock account after maximum failed attempts', async () => {
		// Exhaust all attempts (each throws InvalidCredentialsError).
		for (let i = 0; i < 5; i++) {
			await expect(
				sut.execute({ email: newUser.email, password: 'wrong' }),
			).rejects.toBeInstanceOf(InvalidCredentialsError)
		}
		// Next attempt must be blocked before bcrypt even runs.
		await expect(
			sut.execute({ email: newUser.email, password: 'wrong' }),
		).rejects.toBeInstanceOf(TooManyAttemptsError)
	})

	it('should not allow login while locked even with correct password', async () => {
		// Lock the account directly via the tracker.
		for (let i = 0; i < 5; i++) {
			await loginAttemptTracker.recordFailure(newUser.email)
		}
		await expect(
			sut.execute({ email: newUser.email, password: newUser.password }),
		).rejects.toBeInstanceOf(TooManyAttemptsError)
	})

	it('should clear lockout counter on successful login', async () => {
		// Record some (non-locking) failures.
		await loginAttemptTracker.recordFailure(newUser.email)
		await loginAttemptTracker.recordFailure(newUser.email)

		// Successful login should clear the counter.
		const { user } = await sut.execute({
			email: newUser.email,
			password: newUser.password,
		})
		expect(user.id).toEqual(expect.any(String))

		// Subsequent authentication must still work (counter was cleared).
		await expect(
			sut.execute({ email: newUser.email, password: newUser.password }),
		).resolves.toBeDefined()
	})
})
