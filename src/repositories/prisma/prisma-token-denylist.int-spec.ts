import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '@/lib/prisma'

import { PrismaTokenDenylist } from './prisma-token-denylist'

// Integration: runs in the e2e (prisma) environment against an isolated DB.
describe('PrismaTokenDenylist (integration)', () => {
	afterAll(async () => {
		await prisma.revokedToken.deleteMany()
	})

	it('should warm live entries and prune expired ones on load', async () => {
		await prisma.revokedToken.create({
			data: {
				jti: 'live-jti',
				expires_at: new Date(Date.now() + 60_000),
			},
		})
		await prisma.revokedToken.create({
			data: {
				jti: 'dead-jti',
				expires_at: new Date(Date.now() - 60_000),
			},
		})

		const denylist = new PrismaTokenDenylist()
		await denylist.load()

		// Live entry warmed into the mirror; expired one pruned from RAM and DB.
		expect(await denylist.isRevoked('live-jti')).toBe(true)
		expect(await denylist.isRevoked('dead-jti')).toBe(false)

		const remaining = await prisma.revokedToken.findMany()
		expect(remaining.map((r) => r.jti)).toEqual(['live-jti'])
	})

	it('should persist a revocation to RAM and the database', async () => {
		const denylist = new PrismaTokenDenylist()
		await denylist.revoke('new-jti', new Date(Date.now() + 60_000))

		expect(await denylist.isRevoked('new-jti')).toBe(true)
		const row = await prisma.revokedToken.findUnique({
			where: { jti: 'new-jti' },
		})
		expect(row).not.toBeNull()
	})
})
