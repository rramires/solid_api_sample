import { compare } from 'bcryptjs'

import { User } from '@/prisma-client'
import { ILoginAttemptTracker } from '@/repositories/i-login-attempt-tracker'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { InvalidCredentialsError } from './errors/invalid-credentials-error'
import { TooManyAttemptsError } from './errors/too-many-attempts-error'

// Pre-computed bcrypt hash (12 rounds) of a random value. Used to always run a
// compare() even when the user does not exist, so login timing does not reveal
// whether an email is registered (prevents user enumeration).
const DUMMY_HASH = '$2b$12$v6ELSEn6AsBGZKxCwXkv/u447hl94qlLF/HJm4kuvRsw1GEMvlLJ.'

interface AuthenticateUseCaseRequest {
	email: string
	password: string
}

interface AuthenticateUseCaseResponse {
	user: User
}

export class AuthenticateUseCase {
	constructor(
		private usersRepository: IUsersRepository,
		private loginAttemptTracker: ILoginAttemptTracker,
	) {}

	async execute({
		email,
		password,
	}: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
		// Per-account lockout check runs before bcrypt to short-circuit CPU work on
		// locked accounts and to prevent bcrypt-based DoS amplification attacks.
		if (await this.loginAttemptTracker.isLocked(email)) {
			throw new TooManyAttemptsError()
		}

		const user = await this.usersRepository.findByEmail(email)

		// Always run compare(), even for unknown users, to keep timing constant
		// and prevent user-enumeration via timing differences.
		const hashToCompare = user ? user.password_hash : DUMMY_HASH
		const doesPasswordsMatches = await compare(password, hashToCompare)

		if (!user || !doesPasswordsMatches) {
			// Only record failure against real accounts — there is no account to lock
			// for unknown emails, and recording them would enable a map-flooding attack.
			if (user) {
				await this.loginAttemptTracker.recordFailure(email)
			}
			throw new InvalidCredentialsError()
		}

		await this.loginAttemptTracker.clearAttempts(email)

		return {
			user,
		}
	}
}
