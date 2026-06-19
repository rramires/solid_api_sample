import { randomUUID } from 'node:crypto'

import { Gym, Prisma } from '@/prisma-client'
import { GymCreateInput } from '@/prisma-client/models'
import { getDistanceBetweenCoordinates } from '@/utils/get-distance-between-coordinates'

import {
	IFindManyNearbyParams,
	IGymsRepository,
	IGymUpdateInput,
} from '../i-gyms-repository'

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

	async update(id: string, data: IGymUpdateInput) {
		// Use-case guards existence; mutate only the provided fields.
		const gym = this.items.find((item) => item.id === id)
		if (!gym) {
			throw new Error('Gym not found')
		}
		if (data.title !== undefined) {
			gym.title = data.title
		}
		if (data.description !== undefined) {
			gym.description = data.description
		}
		if (data.phone !== undefined) {
			gym.phone = data.phone
		}
		return gym
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
