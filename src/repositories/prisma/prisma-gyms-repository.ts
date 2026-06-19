import { prisma } from '@/lib/prisma'
import { Gym, Prisma } from '@/prisma-client'
import { GymCreateInput } from '@/prisma-client/models'

import {
	IFindManyNearbyParams,
	IGymsRepository,
	IGymUpdateInput,
} from '../i-gyms-repository'

const PAGE_SIZE = 20
const DISTANCE_IN_KILOMETERS = 10

export class PrismaGymsRepository implements IGymsRepository {
	async create(data: GymCreateInput) {
		const gym = await prisma.gym.create({
			data,
		})
		return gym
	}

	async findById(id: string) {
		const gym = await prisma.gym.findUnique({
			where: {
				id,
			},
		})
		return gym
	}

	async update(id: string, data: IGymUpdateInput) {
		// Existence is guaranteed by the use-case (findById first); `undefined`
		// keys are ignored by Prisma, so only provided fields change.
		const gym = await prisma.gym.update({
			where: {
				id,
			},
			data,
		})
		return gym
	}

	async searchMany(query: string, page: number) {
		const gyms = await prisma.gym.findMany({
			where: {
				title: {
					contains: query,
				},
			},
			take: PAGE_SIZE,
			skip: (page - 1) * PAGE_SIZE,
		})
		return gyms
	}

	async findManyNearby({ latitude, longitude }: IFindManyNearbyParams) {
		const gyms = await prisma.$queryRaw<Gym[]>(
			Prisma.sql`
                        SELECT * from gyms 
                        WHERE ( 6371 * acos( cos( radians(${latitude}) ) * 
                                cos( radians( latitude ) ) * cos( radians( longitude ) - 
                                radians(${longitude}) ) + sin( radians(${latitude}) ) * 
                                sin( radians( latitude ) ) ) ) <= ${DISTANCE_IN_KILOMETERS}
                        ORDER BY ( 6371 * acos( cos( radians(${latitude}) ) * 
                                cos( radians( latitude ) ) * cos( radians( longitude ) - 
                                radians(${longitude}) ) + sin( radians(${latitude}) ) * 
                                sin( radians( latitude ) ) ) ) ASC`,
		)
		return gyms
	}
}
