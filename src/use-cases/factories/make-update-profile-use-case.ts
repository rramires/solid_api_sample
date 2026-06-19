import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { UpdateProfileUseCase } from '../update-profile-use-case'

export function makeUpdateProfileUseCase() {
	const usersRepository = new PrismaUsersRepository()
	const useCase = new UpdateProfileUseCase(usersRepository)
	return useCase
}
