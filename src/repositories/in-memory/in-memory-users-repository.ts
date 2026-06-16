import { randomUUID } from 'node:crypto'

import { Prisma, User } from '@/prisma-client'

import { IUsersRepository } from '../i-users-repository'

export class InMemoryUsersRepository implements IUsersRepository {
	// in-memory mock database
	public items: User[] = []

	async create(data: Prisma.UserCreateInput) {
		// new user
		const user = {
			id: randomUUID(),
			username: data.username,
			email: data.email,
			password_hash: data.password_hash,
			role: data.role ?? 'MEMBER',
			is_verified: data.is_verified ?? false,
			created_at: new Date(),
			password_changed_at: null,
		}
		this.items.push(user)

		// Mirror the prisma repository: never expose password_hash
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			role: user.role,
			is_verified: user.is_verified,
			created_at: user.created_at,
			password_changed_at: user.password_changed_at,
		}
	}

	async findById(id: string) {
		// find by id
		const user = this.items.find((item) => item.id === id)

		return user || null
	}

	async findByEmail(email: string): Promise<User | null> {
		// find by email
		const user = this.items.find((item) => item.email === email)

		return user || null
	}

	async findByUsername(username: string): Promise<User | null> {
		// find by username (case-insensitive, mirrors lowercased storage)
		const lower = username.toLowerCase()
		const user = this.items.find(
			(item) => item.username.toLowerCase() === lower,
		)

		return user || null
	}

	async update(
		id: string,
		data: {
			is_verified?: boolean
			password_hash?: string
			password_changed_at?: Date
		},
	): Promise<void> {
		const user = this.items.find((item) => item.id === id)
		if (!user) {
			return
		}
		if (data.is_verified !== undefined) {
			user.is_verified = data.is_verified
		}
		if (data.password_hash !== undefined) {
			user.password_hash = data.password_hash
		}
		if (data.password_changed_at !== undefined) {
			user.password_changed_at = data.password_changed_at
		}
	}
}
