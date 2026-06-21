import { prisma } from '@/lib/prisma'
import { Prisma, Role } from '@/prisma-client'

import { IUsersRepository } from '../i-users-repository'

const PAGE_SIZE = 20

// Shared projection: never selects password_hash.
const PUBLIC_USER_SELECT = {
	id: true,
	username: true,
	email: true,
	role: true,
	is_verified: true,
	created_at: true,
	password_changed_at: true,
} as const

export class PrismaUsersRepository implements IUsersRepository {
	async findById(id: string) {
		const user = await prisma.user.findUnique({
			where: {
				id,
			},
		})
		return user
	}

	async findPublicById(id: string) {
		// Same projection as findMany: never selects password_hash.
		const user = await prisma.user.findUnique({
			where: { id },
			select: PUBLIC_USER_SELECT,
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
			select: PUBLIC_USER_SELECT,
		})
		return user
	}

	async findMany(page: number) {
		// Admin listing, newest first, 20 per page.
		const users = await prisma.user.findMany({
			orderBy: { created_at: 'desc' },
			take: PAGE_SIZE,
			skip: (page - 1) * PAGE_SIZE,
			select: PUBLIC_USER_SELECT,
		})
		return users
	}

	async update(
		id: string,
		data: {
			username?: string
			email?: string
			role?: Role
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
			select: PUBLIC_USER_SELECT,
		})
		return user
	}
}
