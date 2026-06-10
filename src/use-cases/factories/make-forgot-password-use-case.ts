import { emailProvider } from '@/lib/email'
import { PrismaPasswordResetRepository } from '@/repositories/prisma/prisma-password-reset-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { ForgotPasswordUseCase } from '../forgot-password-use-case'

export function makeForgotPasswordUseCase() {
	return new ForgotPasswordUseCase(
		new PrismaUsersRepository(),
		new PrismaPasswordResetRepository(),
		emailProvider,
	)
}
