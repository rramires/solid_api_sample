import { compare } from 'bcryptjs'

import { User } from '@/prisma-client'
import { IUsersRepository } from '@/repositories/i-users-repository'

import { InvalidCredentialsError } from './errors/invalid-credentials-error'

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
	constructor(private usersRepository: IUsersRepository) {}

	async execute({
		email,
		password,
	}: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
		const user = await this.usersRepository.findByEmail(email)

		// Always run compare(), even for unknown users, to keep timing constant
		const hashToCompare = user ? user.password_hash : DUMMY_HASH
		const doesPasswordsMatches = await compare(password, hashToCompare)

		if (!user || !doesPasswordsMatches) {
			throw new InvalidCredentialsError()
		}

		return {
			user,
		}
	}
}
