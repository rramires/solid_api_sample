import { emailProvider } from '@/lib/email'
import { PrismaPasswordResetRepository } from '@/repositories/prisma/prisma-password-reset-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { UpdateUserUseCase } from '../update-user-use-case'

export function makeUpdateUserUseCase() {
	return new UpdateUserUseCase(
		new PrismaUsersRepository(),
		new PrismaPasswordResetRepository(),
		emailProvider,
	)
}
