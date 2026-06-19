import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { FetchUsersUseCase } from './fetch-users-use-case'

let usersRepository: InMemoryUsersRepository
let sut: FetchUsersUseCase

describe('Fetch Users Use Case', () => {
	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository()
		sut = new FetchUsersUseCase(usersRepository)
	})

	it('should return an empty list when there are no users', async () => {
		const { users } = await sut.execute({ page: 1 })
		expect(users).toHaveLength(0)
	})

	it('should paginate at 20 per page', async () => {
		for (let i = 1; i <= 22; i++) {
			await usersRepository.create({
				username: `user_${i}`,
				email: `user_${i}@example.com`,
				password_hash: 'hash',
			})
		}

		const page1 = await sut.execute({ page: 1 })
		const page2 = await sut.execute({ page: 2 })

		expect(page1.users).toHaveLength(20)
		expect(page2.users).toHaveLength(2)
	})

	it('should never expose password_hash', async () => {
		await usersRepository.create({
			username: 'johndoe',
			email: 'john@example.com',
			password_hash: 'secret-hash',
		})

		const { users } = await sut.execute({ page: 1 })
		expect(users[0]).not.toHaveProperty('password_hash')
	})
})
