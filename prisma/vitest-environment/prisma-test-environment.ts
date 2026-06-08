import 'dotenv/config'

import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

import mysql from 'mysql2/promise'
import type { Environment } from 'vitest/environments' with { 'resolution-mode': 'import' }

function generateDatabaseUrl(dbName: string) {
	if (!process.env.DATABASE_URL) {
		throw new Error('Please provide DATABASE_URL env variable')
	}
	// Troca o nome do banco no path da URL
	const url = new URL(process.env.DATABASE_URL)
	url.pathname = `/${dbName}`
	return url.toString()
}

/**
 * Isolamento de testes para MySQL:
 * - Cria um banco novo por test file via mysql2 (sem importar o prisma)
 * - Aponta DATABASE_URL para o novo banco
 * - Executa as migrations
 * - Derruba o banco no teardown
 *
 * IMPORTANTE: NÃO importar `prisma` de @/lib/prisma neste arquivo.
 * Se o módulo for carregado aqui, ele fica em cache com o DATABASE_URL
 * original e os test files não conseguem apontar para o banco de teste.
 */
export default <Environment>{
	name: 'prisma',
	transformMode: 'ssr',
	async setup() {
		if (!process.env.DATABASE_URL) {
			throw new Error('Please provide DATABASE_URL env variable')
		}

		// Nome único sem hífens (identificador MySQL válido com backticks)
		const dbName = `test_${randomUUID().replace(/-/g, '_')}`

		// Parse das credenciais da DATABASE_URL
		const url = new URL(process.env.DATABASE_URL)
		const connConfig = {
			host: url.hostname,
			port: Number(url.port) || 3306,
			user: url.username,
			password: url.password,
		}

		// Cria o banco de teste via mysql2 direto (sem passar pelo Prisma)
		const conn = await mysql.createConnection(connConfig)
		await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
		await conn.end()

		// Aponta a variável de ambiente para o novo banco e executa migrations
		process.env.DATABASE_URL = generateDatabaseUrl(dbName)
		execSync('pnpm exec prisma migrate deploy')

		return {
			async teardown() {
				const dropConn = await mysql.createConnection(connConfig)
				await dropConn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``)
				await dropConn.end()
			},
		}
	},
}
