import { PrismaEmailVerificationRepository } from '@/repositories/prisma/prisma-email-verification-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { VerifyEmailUseCase } from '../verify-email-use-case'

export function makeVerifyEmailUseCase() {
	const usersRepository = new PrismaUsersRepository()
	const emailVerificationRepository = new PrismaEmailVerificationRepository()
	return new VerifyEmailUseCase(usersRepository, emailVerificationRepository)
}
