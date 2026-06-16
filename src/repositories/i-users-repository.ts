import { Prisma, User } from '@/prisma-client'

// User shape safe to expose in responses (never includes password_hash)
export type PublicUser = Omit<User, 'password_hash'>

export interface IUsersRepository {
	create(data: Prisma.UserCreateInput): Promise<PublicUser>
	findById(id: string): Promise<User | null>
	findByEmail(email: string): Promise<User | null>
	findByUsername(username: string): Promise<User | null>
	update(
		id: string,
		data: {
			is_verified?: boolean
			password_hash?: string
			password_changed_at?: Date
		},
	): Promise<void>
}
