import { ICheckInsRepository } from '@/repositories/i-check-ins-repository'

interface GetUseMetricsUseCaseRequest {
	userId: string
}

interface GetUseMetricsUseCaseResponse {
	checkInsCount: number
}

export class GetUserMetricsUseCase {
	constructor(private checkInsRepository: ICheckInsRepository) {}

	async execute({ userId }: GetUseMetricsUseCaseRequest): Promise<GetUseMetricsUseCaseResponse> {
		const checkInsCount = await this.checkInsRepository.countByUserId(userId)
		return {
			checkInsCount,
		}
	}
}
