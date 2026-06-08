import { expect, describe, it } from 'vitest'
import { RegisterUseCase } from './register-use-case'
import { compare } from 'bcryptjs'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { beforeEach } from 'vitest'

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
		const { user } = await sut.execute({
			name: 'Jhon Doe',
			email: 'jhondoe@email.com',
			password,
		})

		const isPasswordCorrectHashed = await compare(password, user.password_hash)
		expect(isPasswordCorrectHashed).toBe(true)
	})

	it('should not be able to register with same email twice', async () => {
		const newUser = {
			name: 'Jhon Doe',
			email: 'jhondoe@email.com',
			password: 'abc123',
		}
		// add
		await sut.execute(newUser)

		// add same email - return error
		await expect(sut.execute(newUser)).rejects.toBeInstanceOf(UserAlreadyExistsError)
	})

	it('should be able to register', async () => {
		// add
		const { user } = await sut.execute({
			name: 'Jhon Doe',
			email: 'jhondoe@email.com',
			password: 'abc123',
		})
		// return id string
		expect(user.id).toEqual(expect.any(String))
	})
})
