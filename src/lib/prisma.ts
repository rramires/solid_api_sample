import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { env } from '@/env'

import { PrismaClient } from '../prisma-client'

function createAdapter() {
	const url = new URL(env.DATABASE_URL)
	return new PrismaMariaDb({
		host: url.hostname,
		port: Number(url.port) || 3306,
		user: url.username,
		password: url.password,
		database: url.pathname.slice(1),
		connectionLimit: 5,
	})
}

export const prisma = new PrismaClient({
	adapter: createAdapter(),
	log: env.NODE_ENV === 'development' ? ['query'] : [],
})
