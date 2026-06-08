import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@/env'
import { PrismaClient } from '../prisma-client'

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
})

export const prisma = new PrismaClient({
	adapter,
	log: env.NODE_ENV === 'development' ? ['query'] : [],
})
