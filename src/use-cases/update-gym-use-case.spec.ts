import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryGymsRepository } from '@/repositories/in-memory/in-memory-gyms-repository'

import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { UpdateGymUseCase } from './update-gym-use-case'

let gymsRepository: InMemoryGymsRepository
let sut: UpdateGymUseCase

describe('Update Gym Use Case', () => {
	beforeEach(() => {
		gymsRepository = new InMemoryGymsRepository()
		sut = new UpdateGymUseCase(gymsRepository)
	})

	it('should be able to update all editable fields', async () => {
		const created = await gymsRepository.create({
			title: 'Old Gym',
			description: 'old',
			phone: '1111-2222',
			latitude: 0,
			longitude: 0,
		})

		const { gym } = await sut.execute({
			gymId: created.id,
			title: 'New Gym',
			description: 'new',
			phone: '3333-4444',
		})

		expect(gym.title).toEqual('New Gym')
		expect(gym.description).toEqual('new')
		expect(gym.phone).toEqual('3333-4444')
	})

	it('should only change the provided fields', async () => {
		const created = await gymsRepository.create({
			title: 'Old Gym',
			description: 'keep me',
			phone: 'keep me',
			latitude: 0,
			longitude: 0,
		})

		const { gym } = await sut.execute({
			gymId: created.id,
			title: 'Renamed',
		})

		expect(gym.title).toEqual('Renamed')
		expect(gym.description).toEqual('keep me')
		expect(gym.phone).toEqual('keep me')
	})

	it('should be able to clear nullable fields', async () => {
		const created = await gymsRepository.create({
			title: 'Old Gym',
			description: 'something',
			phone: '1111-2222',
			latitude: 0,
			longitude: 0,
		})

		const { gym } = await sut.execute({
			gymId: created.id,
			description: null,
			phone: null,
		})

		expect(gym.description).toBeNull()
		expect(gym.phone).toBeNull()
	})

	it('should throw ResourceNotFoundError for an unknown gym', async () => {
		await expect(
			sut.execute({ gymId: 'non-existent', title: 'X' }),
		).rejects.toBeInstanceOf(ResourceNotFoundError)
	})
})
