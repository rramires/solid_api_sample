import { beforeEach, expect, describe, it } from 'vitest'
import { InMemoryGymsRepository } from '@/repositories/in-memory/in-memory-gyms-repository'
import { FetchNearbyGymsUseCase } from './fetch-nearby-gyms-use-case'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

let gymsRepository: InMemoryGymsRepository
let sut: FetchNearbyGymsUseCase

// get test positions
const { coordinates, coordinatesPlus5km, coordinatesPlus10km } = getTestCoordinates()

describe('Fetch Gyms Nearby Use Case', () => {
	beforeEach(async () => {
		// in-memory mock database
		gymsRepository = new InMemoryGymsRepository()
		sut = new FetchNearbyGymsUseCase(gymsRepository)
	})

	it('should be able to fetch nearby gyms', async () => {
		// mock three gyms
		await gymsRepository.create({
			title: 'TypeScrypt Gym',
			description: 'Best TS Gyn in the city',
			phone: '9999-8888',
			latitude: coordinates.lat,
			longitude: coordinates.lon,
		})

		await gymsRepository.create({
			title: 'JavaScript Gym',
			description: 'Best JS Gyn in the city',
			phone: '8888-7777',
			latitude: coordinatesPlus5km.lat,
			longitude: coordinatesPlus5km.lon,
		})

		await gymsRepository.create({
			title: 'Fastify Gym',
			description: 'Best FF Gyn in the city',
			phone: '7777-6666',
			latitude: coordinatesPlus10km.lat,
			longitude: coordinatesPlus10km.lon,
		})

		// fetch
		const { gyms } = await sut.execute({
			userLatitude: coordinates.lat,
			userLongitude: coordinates.lon,
		})

		/* 
			Gym 1 distance  0 km - same coordinates
			Gym 2 distance  2.06... km
			Gym 3 distance 14.28... km
		*/

		// check
		expect(gyms).toHaveLength(2)
		expect(gyms).toEqual([
			expect.objectContaining({ title: 'TypeScrypt Gym' }),
			expect.objectContaining({ title: 'JavaScript Gym' }),
		])
	})
})
