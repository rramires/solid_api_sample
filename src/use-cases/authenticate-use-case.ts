import { compare } from 'bcryptjs'

import { User } from '@/prisma-client'
import { ILoginAttemptTracker } from '@/repositories/i-login-attempt-tracker'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { InvalidCredentialsError } from './errors/invalid-credentials-error'
import { TooManyAttemptsError } from './errors/too-many-attempts-error'

// Pre-computed bcrypt hash (12 rounds) of a random value. Used to always run a
// compare() even when the user does not exist, so login timing does not reveal
// whether an email is registered (prevents user enumeration).
const DUMMY_HASH =
	'$2b$12$v6ELSEn6AsBGZKxCwXkv/u447hl94qlLF/HJm4kuvRsw1GEMvlLJ.'

interface AuthenticateUseCaseRequest {
	// Email OR username. A username can never contain '@', so the presence of
	// '@' unambiguously marks the identifier as an email.
	identifier: string
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
		identifier,
		password,
	}: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
		// Resolve the account by email or username. Email matching keeps its
		// existing behavior; usernames are stored lowercase, so lowercase the
		// identifier before the username lookup (case-insensitive login).
		const user = identifier.includes('@')
			? await this.usersRepository.findByEmail(identifier)
			: await this.usersRepository.findByUsername(
					identifier.toLowerCase(),
				)

		// Lockout is keyed by account id (not the identifier string) so an attacker
		// can't sidestep a lock by alternating between a user's email and username.
		// Unknown accounts fall back to the raw identifier (nothing to lock anyway).
		const lockKey = user ? user.id : identifier

		// Per-account lockout check runs before bcrypt to short-circuit CPU work on
		// locked accounts and to prevent bcrypt-based DoS amplification attacks.
		if (await this.loginAttemptTracker.isLocked(lockKey)) {
			throw new TooManyAttemptsError()
		}

		// Always run compare(), even for unknown users, to keep timing constant
		// and prevent user-enumeration via timing differences.
		const hashToCompare = user ? user.password_hash : DUMMY_HASH
		const doesPasswordsMatches = await compare(password, hashToCompare)

		if (!user || !doesPasswordsMatches) {
			// Only record failure against real accounts — there is no account to lock
			// for unknown identifiers, and recording them would enable a
			// map-flooding attack.
			if (user) {
				await this.loginAttemptTracker.recordFailure(lockKey)
			}
			throw new InvalidCredentialsError()
		}

		await this.loginAttemptTracker.clearAttempts(lockKey)

		return {
			user,
		}
	}
}
