import { emailProvider } from '@/lib/email'
import { PrismaEmailChangeRepository } from '@/repositories/prisma/prisma-email-change-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { RequestEmailChangeUseCase } from '../request-email-change-use-case'

export function makeRequestEmailChangeUseCase() {
	return new RequestEmailChangeUseCase(
		new PrismaUsersRepository(),
		new PrismaEmailChangeRepository(),
		emailProvider,
	)
}
