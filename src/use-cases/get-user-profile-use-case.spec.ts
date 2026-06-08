import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'
import { expect, describe, it } from 'vitest'
import { GetUserProfileUseCase } from './get-user-profile-use-case'
import { hash } from 'bcryptjs'
import { beforeEach } from 'vitest'
import { User } from '@/prisma-client'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

let usersRepository: InMemoryUsersRepository
const newUser = {
	name: 'Jhon Doe',
	email: 'jhondoe@email.com',
	password: 'abc123',
}
let sut: GetUserProfileUseCase
let createdUser: User

describe('Get User Profile Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		createdUser = await usersRepository.create({
			name: newUser.name,
			email: newUser.email,
			password_hash: await hash(newUser.password, 12),
		})

		sut = new GetUserProfileUseCase(usersRepository)
	})

	it('should be able to get user profile', async () => {
		// find by id
		const { user } = await sut.execute({
			userId: createdUser.id,
		})
		// check
		expect(user.id).toEqual(expect.any(String))
		expect(user.name).toEqual(createdUser.name)
	})

	it('should not be able to get user profile with wrong id', async () => {
		// find by invalid id
		await expect(
			sut.execute({
				userId: 'invalid-id',
			}),
		).rejects.toBeInstanceOf(ResourceNotFoundError)
	})
})
