import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { expect, describe, it } from 'vitest'
import { AuthenticateUseCase } from './authenticate-use-case'
import { hash } from 'bcryptjs'
import { InvalidCredentialsError } from './errors/invalid-credentials-error'
import { beforeEach } from 'vitest'

let usersRepository: InMemoryUsersRepository
const newUser = {
	name: 'Jhon Doe',
	email: 'jhondoe@email.com',
	password: 'abc123',
}
let sut: AuthenticateUseCase

describe('Authenticate Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		await usersRepository.create({
			name: newUser.name,
			email: newUser.email,
			password_hash: await hash(newUser.password, 12),
		})

		sut = new AuthenticateUseCase(usersRepository)
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
})
