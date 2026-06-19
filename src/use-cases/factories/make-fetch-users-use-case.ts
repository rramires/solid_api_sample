import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { FetchUsersUseCase } from '../fetch-users-use-case'

export function makeFetchUsersUseCase() {
	const usersRepository = new PrismaUsersRepository()
	const useCase = new FetchUsersUseCase(usersRepository)
	return useCase
}
