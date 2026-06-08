import { Prisma, User } from '@/prisma-client'
import { IUsersRepository } from '../i-users-repository'
import { randomUUID } from 'node:crypto'

export class InMemoryUsersRepository implements IUsersRepository {
	// in-memory mock database
	public items: User[] = []

	async create(data: Prisma.UserCreateInput) {
		// new user
		const user = {
			id: randomUUID(),
			name: data.name,
			email: data.email,
			password_hash: data.password_hash,
			created_at: new Date(),
		}
		this.items.push(user)

		return user
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
}
