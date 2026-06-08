import { IGymsRepository } from '@/repositories/i-gyms-repository'
import { Gym } from '@/prisma-client'

interface SearchGymsUseCaseRequest {
	query: string
	page: number
}

interface SearchGymsUseCaseResponse {
	gyms: Gym[]
}

export class SearchGymsUseCase {
	constructor(private gymsRepository: IGymsRepository) {}

	async execute({ query, page }: SearchGymsUseCaseRequest): Promise<SearchGymsUseCaseResponse> {
		// search
		const gyms = await this.gymsRepository.searchMany(query, page)
		return {
			gyms,
		}
	}
}
