import { beforeEach, expect, describe, it } from 'vitest'
import { InMemoryCheckInsRepository } from '@/repositories/in-memory/in-memory-check-ins-repository'
import { FetchCheckInsHistoryUseCase } from './fetch-check-ins-history-use-case'

let checkInsRepository: InMemoryCheckInsRepository
let sut: FetchCheckInsHistoryUseCase

describe('Fetch Check-in History Use Case', () => {
	beforeEach(async () => {
		// in-memory mock database
		checkInsRepository = new InMemoryCheckInsRepository()
		sut = new FetchCheckInsHistoryUseCase(checkInsRepository)
	})

	it('should be able to fetch check-in history', async () => {
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
		const { checkIns } = await sut.execute({
			userId: 'user-01',
			page: 1,
		})

		// check
		expect(checkIns).toHaveLength(2)
		expect(checkIns).toEqual([
			expect.objectContaining({ gym_id: 'gym-01' }),
			expect.objectContaining({ gym_id: 'gym-02' }),
		])
	})

	it('should be able to fetch paginated check-in history', async () => {
		// mock 22 check-ins
		for (let i = 1; i <= 22; i++) {
			await checkInsRepository.create({
				gym_id: `gym-${i}`,
				user_id: 'user-01',
			})
		}

		// fetch
		const { checkIns } = await sut.execute({
			userId: 'user-01',
			page: 2,
		})

		// check
		expect(checkIns).toHaveLength(2)
		expect(checkIns).toEqual([
			expect.objectContaining({ gym_id: 'gym-21' }),
			expect.objectContaining({ gym_id: 'gym-22' }),
		])
	})
})
