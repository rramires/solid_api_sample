import { prisma } from '@/lib/prisma'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { Environment } from 'vitest/environments' with { 'resolution-mode': 'import' }

function generateDatabaseUrl(schema: string) {
	if (!process.env.DATABASE_URL) {
		throw new Error('Please provide DATABASE_URL env variable')
	}
	// change schema "postgresql://... ?schema=public" to schema=UUID(random)
	const url = new URL(process.env.DATABASE_URL)
	url.searchParams.set('schema', schema)

	return url.toString()
}

/**
 * Change database environment for tests
 * This 'called' in test section in vite.config.mts
 */
export default <Environment>{
	name: 'prisma',
	transformMode: 'ssr',
	async setup() {
		// 1 - Executed before tests
		// change database schema
		const schema = randomUUID()
		const databaseUrl = generateDatabaseUrl(schema)
		process.env.DATABASE_URL = databaseUrl
		// create tests database in the new schema
		execSync('npx prisma migrate deploy')
		return {
			// 2 - Executed after tests
			async teardown() {
				// drop tests database and close connection
				await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
				await prisma.$disconnect()
			},
		}
	},
}
