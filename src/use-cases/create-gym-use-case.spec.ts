import { describe, expect, it } from 'vitest'
import { beforeEach } from 'vitest'

import { InMemoryGymsRepository } from '@/repositories/in-memory/in-memory-gyms-repository'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

import { CreateGymUseCase } from './create-gym-use-case'

// get test position
const { coordinates } = getTestCoordinates()

let gymsRepository: InMemoryGymsRepository
let sut: CreateGymUseCase

describe('Create Gym Use Case', () => {
	beforeEach(() => {
		// in-memory mock database
		gymsRepository = new InMemoryGymsRepository()
		sut = new CreateGymUseCase(gymsRepository)
	})

	it('should be able to create gym', async () => {
		// add
		const { gym } = await sut.execute({
			title: 'TypeScrypt Gym',
			description: 'Best Gyn in the city',
			phone: '9999-8888',
			latitude: coordinates.lat,
			longitude: coordinates.lon,
		})
		// return id string
		expect(gym.id).toEqual(expect.any(String))
	})

	it('should be able to create gym without optional fields', async () => {
		const { gym } = await sut.execute({
			title: 'Minimal Gym',
			description: null,
			phone: null,
			latitude: coordinates.lat,
			longitude: coordinates.lon,
		})
		expect(gym.id).toEqual(expect.any(String))
		expect(gym.description).toBeNull()
		expect(gym.phone).toBeNull()
	})
})
