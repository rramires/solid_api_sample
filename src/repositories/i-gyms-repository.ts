import { Gym, Prisma } from '@/prisma-client'

export interface IFindManyNearbyParams {
	latitude: number
	longitude: number
}

// Partial edit: only the admin-editable fields. `undefined` = leave as-is;
// `null` clears the nullable description/phone.
export interface IGymUpdateInput {
	title?: string
	description?: string | null
	phone?: string | null
}

export interface IGymsRepository {
	create(data: Prisma.GymCreateInput): Promise<Gym>
	findById(id: string): Promise<Gym | null>
	update(id: string, data: IGymUpdateInput): Promise<Gym>
	searchMany(query: string, page: number): Promise<Gym[]>
	findManyNearby(params: IFindManyNearbyParams): Promise<Gym[]>
}
