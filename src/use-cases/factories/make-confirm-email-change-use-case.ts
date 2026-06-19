import { PrismaEmailChangeRepository } from '@/repositories/prisma/prisma-email-change-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { ConfirmEmailChangeUseCase } from '../confirm-email-change-use-case'

export function makeConfirmEmailChangeUseCase() {
	return new ConfirmEmailChangeUseCase(
		new PrismaUsersRepository(),
		new PrismaEmailChangeRepository(),
	)
}
