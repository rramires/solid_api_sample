import { IUsersRepository } from '@/repositories/i-users-repository'
import { hash } from 'bcryptjs'
import { UserAlreadyExistsError } from './errors/user-already-exists-error'
import { User } from '@/prisma-client'

interface RegisterUseCaseRequest {
	name: string
	email: string
	password: string
}

interface RegisterUseCaseResponse {
	user: User
}

export class RegisterUseCase {
	constructor(private usersRepository: IUsersRepository) {}
	/* 
		Hack: Using "private" or "public" in the constructor parameters does 
		the same as declaring the property before the constructor and then assigning this:
		
		private usersRepository: any
		constructor(usersRepository: any) {
			this.usersRepository = usersRepository
		}
	*/

	async execute({
		name,
		email,
		password,
	}: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
		// check email
		const userWithSameEmail = await this.usersRepository.findByEmail(email)
		if (userWithSameEmail) {
			throw new UserAlreadyExistsError()
		}
		// hash
		const password_hash = await hash(password, 12)
		// call persistence
		const user = await this.usersRepository.create({
			name,
			email,
			password_hash,
		})
		return {
			user,
		}
	}
}
