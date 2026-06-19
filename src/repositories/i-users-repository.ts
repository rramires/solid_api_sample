import { Prisma, Role, User } from '@/prisma-client'

// User shape safe to expose in responses (never includes password_hash)
export type PublicUser = Omit<User, 'password_hash'>

export interface IUsersRepository {
	create(data: Prisma.UserCreateInput): Promise<PublicUser>
	findById(id: string): Promise<User | null>
	findByEmail(email: string): Promise<User | null>
	findByUsername(username: string): Promise<User | null>
	findMany(page: number): Promise<PublicUser[]>
	update(
		id: string,
		data: {
			username?: string
			email?: string
			role?: Role
			is_verified?: boolean
			password_hash?: string
			password_changed_at?: Date
		},
	): Promise<PublicUser>
}
