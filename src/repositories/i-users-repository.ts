import { Prisma, User } from '@/prisma-client'

// User shape safe to expose in responses (never includes password_hash)
export type PublicUser = Omit<User, 'password_hash'>

export interface IUsersRepository {
	create(data: Prisma.UserCreateInput): Promise<PublicUser>
	findById(id: string): Promise<User | null>
	findByEmail(email: string): Promise<User | null>
}
