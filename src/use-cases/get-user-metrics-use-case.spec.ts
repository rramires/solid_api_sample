import { beforeEach, expect, describe, it } from 'vitest'
import { InMemoryCheckInsRepository } from '@/repositories/in-memory/in-memory-check-ins-repository'
import { GetUserMetricsUseCase } from './get-user-metrics-use-case'

let checkInsRepository: InMemoryCheckInsRepository
let sut: GetUserMetricsUseCase

describe('Get User Metrics Use Case', () => {
	beforeEach(async () => {
		// in-memory mock database
		checkInsRepository = new InMemoryCheckInsRepository()
		sut = new GetUserMetricsUseCase(checkInsRepository)
	})

	it('should be able to get check-ins count from metrics', async () => {
		// mock two check-ins
		await checkInsRepository.create({
			gym_id: 'gym-01',
			user_id: 'user-01',
		})
		await checkInsRepository.create({
			gym_id: 'gym-02',
			user_id: 'user-01',
		})

		// fetch
		const { checkInsCount } = await sut.execute({
			userId: 'user-01',
		})

		// check
		expect(checkInsCount).toEqual(2)
	})
})
