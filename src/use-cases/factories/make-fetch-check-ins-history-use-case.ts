import { PrismaCheckInsRepository } from '@/repositories/prisma/prisma-check-ins-repository'
import { FetchCheckInsHistoryUseCase } from '../fetch-check-ins-history-use-case'

export function makeFetchCheckInsHistoryUseCase() {
	const checkInsRepository = new PrismaCheckInsRepository()
	const useCase = new FetchCheckInsHistoryUseCase(checkInsRepository)
	return useCase
}
