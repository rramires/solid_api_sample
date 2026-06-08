import { prisma } from '@/lib/prisma'
import { CheckIn } from '@/prisma-client'
import { CheckInUncheckedCreateInput } from '@/prisma-client/models'
import { ICheckInsRepository } from '../i-check-ins-repository'

import dayjs from 'dayjs'

const PAGE_SIZE = 20

export class PrismaCheckInsRepository implements ICheckInsRepository {
	async create(data: CheckInUncheckedCreateInput) {
		const checkIn = await prisma.checkIn.create({ data })
		return checkIn
	}

	async findById(id: string) {
		const checkIn = await prisma.checkIn.findUnique({
			where: {
				id,
			},
		})
		return checkIn
	}

	async save(data: CheckIn) {
		const checkIn = await prisma.checkIn.update({
			where: {
				id: data.id,
			},
			data,
		})
		return checkIn
	}

	async findByUserIdOnDate(userId: string, date: Date) {
		const startOfTheDay = dayjs(date).startOf('date') // 2025-05-22T00:00:00Z
		const endOfTheDay = dayjs(date).endOf('date') //    2025-05-22T23:59:59Z

		const checkIn = await prisma.checkIn.findFirst({
			where: {
				user_id: userId,
				created_at: {
					gte: startOfTheDay.toDate(),
					lte: endOfTheDay.toDate(),
				},
			},
		})
		return checkIn
	}

	async findManyByUserId(userId: string, page: number) {
		const checkIns = await prisma.checkIn.findMany({
			where: {
				user_id: userId,
			},
			take: PAGE_SIZE,
			skip: (page - 1) * PAGE_SIZE,
		})
		return checkIns
	}

	async countByUserId(userId: string) {
		const count = await prisma.checkIn.count({
			where: {
				user_id: userId,
			},
		})
		return count
	}
}
