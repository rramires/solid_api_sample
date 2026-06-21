import { IUsersRepository, PublicUser } from '@/repositories/i-users-repository'

import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface GetUserUseCaseRequest {
	userId: string
}

interface GetUserUseCaseResponse {
	user: PublicUser
}

export class GetUserUseCase {
	constructor(private usersRepository: IUsersRepository) {}

	async execute({
		userId,
	}: GetUserUseCaseRequest): Promise<GetUserUseCaseResponse> {
		// Public projection: password_hash is never read from the database.
		const user = await this.usersRepository.findPublicById(userId)
		if (!user) {
			throw new ResourceNotFoundError()
		}
		return {
			user,
		}
	}
}
