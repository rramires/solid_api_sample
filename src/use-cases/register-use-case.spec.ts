import { compare } from 'bcryptjs'
import { describe, expect, it } from 'vitest'
import { beforeEach } from 'vitest'

import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { RegisterUseCase } from './register-use-case'

let usersRepository: InMemoryUsersRepository
let sut: RegisterUseCase

describe('Register Use Case', () => {
	beforeEach(() => {
		// in-memory mock database
		usersRepository = new InMemoryUsersRepository()
		sut = new RegisterUseCase(usersRepository)
	})

	it('should be possible to hash the password when registering a new user', async () => {
		const password = 'abc123'
		await sut.execute({
			username: 'johndoe',
			email: 'jhondoe@email.com',
			password,
		})

		// password_hash is not returned anymore; read it from the repository
		const createdUser = usersRepository.items[0]
		const isPasswordCorrectHashed = await compare(
			password,
			createdUser.password_hash,
		)
		expect(isPasswordCorrectHashed).toBe(true)
	})

	it('should not be able to register with same email twice', async () => {
		const newUser = {
			username: 'johndoe',
			email: 'jhondoe@email.com',
			password: 'abc123',
		}
		// add
		await sut.execute(newUser)

		// add same email - return error
		await expect(sut.execute(newUser)).rejects.toBeInstanceOf(
			UserAlreadyExistsError,
		)
	})

	it('should be able to register', async () => {
		// add
		const { user } = await sut.execute({
			username: 'johndoe',
			email: 'jhondoe@email.com',
			password: 'abc123',
		})
		// return id string
		expect(user.id).toEqual(expect.any(String))
	})
})
