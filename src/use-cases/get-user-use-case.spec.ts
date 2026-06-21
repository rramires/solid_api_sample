import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

import { PublicUser } from '@/repositories/i-users-repository'
import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { GetUserUseCase } from './get-user-use-case'

let usersRepository: InMemoryUsersRepository
const newUser = {
	username: 'johndoe',
	email: 'johndoe@email.com',
	password: 'abc123',
}
let sut: GetUserUseCase
let createdUser: PublicUser

describe('Get User Use Case', () => {
	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository()
		createdUser = await usersRepository.create({
			username: newUser.username,
			email: newUser.email,
			password_hash: await hash(newUser.password, 12),
		})

		sut = new GetUserUseCase(usersRepository)
	})

	it('should be able to get a user by id (public projection)', async () => {
		const { user } = await sut.execute({
			userId: createdUser.id,
		})

		// Exact PublicUser shape — same fields as each item of findMany.
		expect(user).toEqual({
			id: createdUser.id,
			username: newUser.username,
			email: newUser.email,
			role: 'MEMBER',
			is_verified: false,
			created_at: expect.any(Date),
			password_changed_at: null,
		})
		// Never leaks the password hash.
		expect(user).not.toHaveProperty('password_hash')
	})

	it('should throw ResourceNotFoundError for a non-existent id', async () => {
		await expect(
			sut.execute({
				userId: 'non-existent-id',
			}),
		).rejects.toBeInstanceOf(ResourceNotFoundError)
	})
})
