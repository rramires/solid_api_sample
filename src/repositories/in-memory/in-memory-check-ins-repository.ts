import { CheckIn, Prisma } from '@/prisma-client'
import { ICheckInsRepository } from '../i-check-ins-repository'
import { randomUUID } from 'node:crypto'
import dayjs from 'dayjs'

const PAGE_SIZE = 20

export class InMemoryCheckInsRepository implements ICheckInsRepository {
	// in-memory mock database
	public items: CheckIn[] = []

	async create(data: Prisma.CheckInUncheckedCreateInput) {
		// new checkIn
		const checkIn = {
			id: randomUUID(),
			user_id: data.user_id,
			gym_id: data.gym_id,
			validated_at: data.validated_at ? new Date(data.validated_at) : null,
			created_at: new Date(),
		}
		this.items.push(checkIn)

		return checkIn
	}

	async findById(id: string) {
		const checkIn = this.items.find((item) => item.id === id)
		if (!checkIn) {
			return null
		}

		return checkIn
	}

	async save(checkIn: CheckIn) {
		const checkInIndex = this.items.findIndex((item) => item.id === checkIn.id)
		if (checkInIndex >= 0) {
			this.items[checkInIndex] = checkIn
		}

		return checkIn
	}

	async findByUserIdOnDate(userId: string, date: Date) {
		const startOfTheDay = dayjs(date).startOf('date') // 2025-05-22T00:00:00Z
		const endOfTheDay = dayjs(date).endOf('date') //    2025-05-22T23:59:59Z

		const checkInOnSameDate = this.items.find((checkIn) => {
			const checkInDate = dayjs(checkIn.created_at)
			const isOnSameDate =
				checkInDate.isAfter(startOfTheDay) && checkInDate.isBefore(endOfTheDay)

			return checkIn.user_id === userId && isOnSameDate
		})
		return checkInOnSameDate || null
	}

	async findManyByUserId(userId: string, page: number) {
		return this.items
			.filter((item) => item.user_id === userId)
			.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
	}

	async countByUserId(userId: string) {
		return this.items.filter((item) => item.user_id === userId).length
	}
}
