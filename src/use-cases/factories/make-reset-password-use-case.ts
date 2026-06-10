import { loginAttemptTracker } from '@/lib/login-attempt-tracker'
import { passwordChangedRegistry } from '@/lib/password-changed-registry'
import { PrismaPasswordResetRepository } from '@/repositories/prisma/prisma-password-reset-repository'
import { PrismaUsersRepository } from '@/repositories/prisma/prisma-users-repository'

import { ResetPasswordUseCase } from '../reset-password-use-case'

export function makeResetPasswordUseCase() {
	return new ResetPasswordUseCase(
		new PrismaUsersRepository(),
		new PrismaPasswordResetRepository(),
		passwordChangedRegistry,
		loginAttemptTracker,
	)
}
