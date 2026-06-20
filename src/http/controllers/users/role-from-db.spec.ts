import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import { prisma } from '@/lib/prisma'
import { Role } from '@/prisma-client/enums'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'

// Regression: authorization must read the role from the DB, not the JWT claim.
// An admin demoted to MEMBER must lose access on the very next request even
// though their existing token still carries `role: ADMIN`.
describe('Role authorized from the DB, not the JWT claim (e2e)', () => {
	let adminToken: string
	let userId: string

	beforeAll(async () => {
		await app.ready()
		const admin = await createAndAuthUser(app, true)
		adminToken = admin.token
		userId = admin.user.id
	})

	afterAll(async () => {
		await app.close()
	})

	it('forbids a demoted admin on the next request despite the stale ADMIN claim', async () => {
		// Token claims ADMIN and the DB agrees → allowed.
		const before = await request(app.server)
			.get('/users')
			.set('Authorization', `Bearer ${adminToken}`)
		expect(before.statusCode).toEqual(200)

		// Demote in the DB only; the token is untouched and still claims ADMIN.
		await prisma.user.update({
			where: { id: userId },
			data: { role: Role.MEMBER },
		})

		// Authorization re-checks the DB → now forbidden, despite the stale claim.
		const after = await request(app.server)
			.get('/users')
			.set('Authorization', `Bearer ${adminToken}`)
		expect(after.statusCode).toEqual(403)
	})
})
