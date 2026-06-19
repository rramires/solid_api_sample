import { prisma } from '@/lib/prisma'
import { Prisma } from '@/prisma-client'

import { IUsersRepository } from '../i-users-repository'

export class PrismaUsersRepository implements IUsersRepository {
	async findById(id: string) {
		const user = await prisma.user.findUnique({
			where: {
				id,
			},
		})
		return user
	}

	async findByEmail(email: string) {
		const user = await prisma.user.findUnique({
			where: {
				email,
			},
		})
		return user
	}

	async findByUsername(username: string) {
		const user = await prisma.user.findUnique({
			where: {
				username,
			},
		})
		return user
	}

	async create(data: Prisma.UserCreateInput) {
		const user = await prisma.user.create({
			data,
			// Never return password_hash to callers
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				is_verified: true,
				created_at: true,
				password_changed_at: true,
			},
		})
		return user
	}

	async update(
		id: string,
		data: {
			username?: string
			is_verified?: boolean
			password_hash?: string
			password_changed_at?: Date
		},
	) {
		// Returns the updated public user (never password_hash). Existing callers
		// that ignore the return value are unaffected.
		const user = await prisma.user.update({
			where: { id },
			data,
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				is_verified: true,
				created_at: true,
				password_changed_at: true,
			},
		})
		return user
	}
}
