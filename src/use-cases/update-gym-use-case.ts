import { Gym } from '@/prisma-client'
import { IGymsRepository } from '@/repositories/i-gyms-repository'

import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateGymUseCaseRequest {
	gymId: string
	title?: string
	description?: string | null
	phone?: string | null
}

interface UpdateGymUseCaseResponse {
	gym: Gym
}

export class UpdateGymUseCase {
	constructor(private gymsRepository: IGymsRepository) {}

	async execute({
		gymId,
		title,
		description,
		phone,
	}: UpdateGymUseCaseRequest): Promise<UpdateGymUseCaseResponse> {
		// 404 before any write so a missing gym never reaches the repo.
		const exists = await this.gymsRepository.findById(gymId)
		if (!exists) {
			throw new ResourceNotFoundError()
		}

		const gym = await this.gymsRepository.update(gymId, {
			title,
			description,
			phone,
		})

		return {
			gym,
		}
	}
}
