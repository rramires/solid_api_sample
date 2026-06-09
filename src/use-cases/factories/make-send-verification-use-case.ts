import { emailProvider } from '@/lib/email'
import { PrismaEmailVerificationRepository } from '@/repositories/prisma/prisma-email-verification-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { SendVerificationUseCase } from '../send-verification-use-case'

export function makeSendVerificationUseCase() {
	const usersRepository = new PrismaUsersRepository()
	const emailVerificationRepository = new PrismaEmailVerificationRepository()
	return new SendVerificationUseCase(
		usersRepository,
		emailVerificationRepository,
		emailProvider,
	)
}
