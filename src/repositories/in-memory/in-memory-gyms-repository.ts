import { Gym, Prisma } from '@/prisma-client'
import { IGymsRepository, IFindManyNearbyParams } from '../i-gyms-repository'
import { GymCreateInput } from '@/prisma-client/models'
import { randomUUID } from 'node:crypto'
import { getDistanceBetweenCoordinates } from '@/utils/get-distance-between-coordinates'

const PAGE_SIZE = 20
const DISTANCE_IN_KILOMETERS = 10

export class InMemoryGymsRepository implements IGymsRepository {
	// in-memory mock database
	public items: Gym[] = []

	async create(data: GymCreateInput) {
		// new gym
		const gym = {
			id: data.id ?? randomUUID(),
			title: data.title,
			description: data.description ?? null,
			phone: data.phone ?? null,
			latitude: new Prisma.Decimal(data.latitude.toString()),
			longitude: new Prisma.Decimal(data.longitude.toString()),
			created_at: new Date(),
		}
		this.items.push(gym)

		return gym
	}

	async findById(id: string) {
		// find by id
		const gym = this.items.find((item) => item.id === id)

		return gym || null
	}

	async searchMany(query: string, page: number) {
		// find by title
		return this.items
			.filter((item) => item.title.includes(query))
			.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
	}

	async findManyNearby(params: IFindManyNearbyParams) {
		return this.items.filter((item) => {
			const distance = getDistanceBetweenCoordinates(
				{
					latitude: params.latitude,
					longitude: params.longitude,
				},
				{
					latitude: item.latitude.toNumber(),
					longitude: item.longitude.toNumber(),
				},
			)
			return distance < DISTANCE_IN_KILOMETERS
		})
	}
}
