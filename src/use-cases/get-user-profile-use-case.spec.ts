import { hash } from 'bcryptjs'
import { describe, expect, it } from 'vitest'
import { beforeEach } from 'vitest'

import { PublicUser } from '@/repositories/i-users-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { GetUserProfileUseCase } from './get-user-profile-use-case'

let usersRepository: InMemoryUsersRepository
const newUser = {
	username: 'johndoe',
	email: 'jhondoe@email.com',
	password: 'abc123',
}
let sut: GetUserProfileUseCase
let createdUser: PublicUser

describe('Get User Profile Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		createdUser = await usersRepository.create({
			username: newUser.username,
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
		expect(user.username).toEqual(createdUser.username)
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
