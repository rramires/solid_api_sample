import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryUsersRepository } from '@/repositories/in-memory/in-memory-users-repository'

import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { UpdateProfileUseCase } from './update-profile-use-case'

let usersRepository: InMemoryUsersRepository
let sut: UpdateProfileUseCase

describe('Update Profile Use Case', () => {
	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository()
		sut = new UpdateProfileUseCase(usersRepository)
	})

	it('should let a user change their own username', async () => {
		const created = await usersRepository.create({
			username: 'johndoe',
			email: 'john@example.com',
			password_hash: 'hash',
		})

		const { user } = await sut.execute({
			userId: created.id,
			username: 'john_renamed',
		})

		expect(user.username).toEqual('john_renamed')
		expect(user.id).toEqual(created.id)
	})

	it('should allow renaming to the same username (no-op)', async () => {
		const created = await usersRepository.create({
			username: 'johndoe',
			email: 'john@example.com',
			password_hash: 'hash',
		})

		const { user } = await sut.execute({
			userId: created.id,
			username: 'johndoe',
		})

		expect(user.username).toEqual('johndoe')
	})

	it('should reject a username already taken by another user', async () => {
		await usersRepository.create({
			username: 'taken',
			email: 'taken@example.com',
			password_hash: 'hash',
		})
		const created = await usersRepository.create({
			username: 'johndoe',
			email: 'john@example.com',
			password_hash: 'hash',
		})

		await expect(
			sut.execute({ userId: created.id, username: 'taken' }),
		).rejects.toBeInstanceOf(UserAlreadyExistsError)
	})
})
