import { IGymsRepository } from '@/repositories/i-gyms-repository'
import { Gym } from '@/prisma-client'

interface FetchNearbyGymsUseCaseRequest {
	userLatitude: number
	userLongitude: number
}

interface FetchNearbyGymsCaseResponse {
	gyms: Gym[]
}

export class FetchNearbyGymsUseCase {
	constructor(private gymsRepository: IGymsRepository) {}

	async execute({
		userLatitude,
		userLongitude,
	}: FetchNearbyGymsUseCaseRequest): Promise<FetchNearbyGymsCaseResponse> {
		// find
		const gyms = await this.gymsRepository.findManyNearby({
			latitude: userLatitude,
			longitude: userLongitude,
		})
		return {
			gyms,
		}
	}
}
