import { IUsersRepository, PublicUser } from '@/repositories/i-users-repository'

interface FetchUsersUseCaseRequest {
	page: number
}

interface FetchUsersUseCaseResponse {
	users: PublicUser[]
}

export class FetchUsersUseCase {
	constructor(private usersRepository: IUsersRepository) {}

	async execute({
		page,
	}: FetchUsersUseCaseRequest): Promise<FetchUsersUseCaseResponse> {
		const users = await this.usersRepository.findMany(page)

		return {
			users,
		}
	}
}
