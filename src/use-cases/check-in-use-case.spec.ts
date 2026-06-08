import { beforeEach, afterEach, expect, describe, it, vi } from 'vitest'
import { InMemoryCheckInsRepository } from '@/repositories/in-memory/in-memory-check-ins-repository'
import { InMemoryGymsRepository } from '@/repositories/in-memory/in-memory-gyms-repository'
import { CheckInUseCase } from './check-in-use-case'
import { MaxDistanceError } from './errors/max-distance.error'
import { MaxCheckInsReachedError } from './errors/max-check-ins-reached-error'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

let checkInsRepository: InMemoryCheckInsRepository
let gymsRepository: InMemoryGymsRepository
let sut: CheckInUseCase

// get test positions
const { coordinates, coordinatesPlus10km } = getTestCoordinates()

describe('Check-in Use Case', () => {
	beforeEach(async () => {
		// in-memory mock database
		checkInsRepository = new InMemoryCheckInsRepository()
		gymsRepository = new InMemoryGymsRepository()
		sut = new CheckInUseCase(checkInsRepository, gymsRepository)

		// mock gym
		await gymsRepository.create({
			id: 'gym-01',
			title: 'TypeScript Gym',
			description: 'Best Gyn in the city',
			phone: '9999-8888',
			latitude: coordinates.lat,
			longitude: coordinates.lon,
		})

		// Enable fix datetime
		vi.useFakeTimers()
	})

	afterEach(() => {
		// Run real datetime again
		vi.useRealTimers()
	})

	it('should be able to check in', async () => {
		// add
		const { checkIn } = await sut.execute({
			userId: 'user-01',
			gymId: 'gym-01',
			userLatitude: coordinates.lat,
			userLongitude: coordinates.lon,
		})
		// return id string
		expect(checkIn.id).toEqual(expect.any(String))
	})

	it('should not be able to check in twice in the same day', async () => {
		// Fix date
		vi.setSystemTime(new Date('2025-05-22T08:00:00Z'))
		// Add 1º check in
		await sut.execute({
			userId: 'user-01',
			gymId: 'gym-01',
			userLatitude: coordinates.lat,
			userLongitude: coordinates.lon,
		})
		// Try 2º check in
		await expect(
			sut.execute({
				userId: 'user-01',
				gymId: 'gym-01',
				userLatitude: coordinates.lat,
				userLongitude: coordinates.lon,
			}),
		).rejects.toBeInstanceOf(MaxCheckInsReachedError)
	})

	it('should be able to check in twice but in different days', async () => {
		// Fix date
		vi.setSystemTime(new Date('2025-05-22T08:00:00Z'))
		// Add 1º check in
		await sut.execute({
			userId: 'user-01',
			gymId: 'gym-01',
			userLatitude: coordinates.lat,
			userLongitude: coordinates.lon,
		})
		// Fix different date
		vi.setSystemTime(new Date('2025-05-23T08:00:00Z'))
		// Add 2º check in - OK
		const { checkIn } = await sut.execute({
			userId: 'user-01',
			gymId: 'gym-01',
			userLatitude: coordinates.lat,
			userLongitude: coordinates.lon,
		})
		// return id string
		expect(checkIn.id).toEqual(expect.any(String))
	})

	it('should not be able to check in on distant gym', async () => {
		// The coordinates of this new user are more than 100m from the gym-01 gym
		await expect(
			sut.execute({
				userId: 'user-01',
				gymId: 'gym-01',
				userLatitude: coordinatesPlus10km.lat,
				userLongitude: coordinatesPlus10km.lon,
			}),
		).rejects.toBeInstanceOf(MaxDistanceError)
	})
})
