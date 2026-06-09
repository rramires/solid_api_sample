import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'

describe('Logout (e2e)', () => {
	beforeAll(async () => {
		await app.ready()
	})

	afterAll(async () => {
		await app.close()
	})

	it('should be able to logout', async () => {
		const { token } = await createAndAuthUser(app)

		const response = await request(app.server)
			.post('/logout')
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(204)
	})

	it('should reject a revoked token after logout', async () => {
		const { token } = await createAndAuthUser(app)

		// The token works before logout.
		const before = await request(app.server)
			.get('/me')
			.set('Authorization', `Bearer ${token}`)
			.send()
		expect(before.statusCode).toEqual(200)

		// Revoke it.
		await request(app.server)
			.post('/logout')
			.set('Authorization', `Bearer ${token}`)
			.send()

		// The same token is now rejected.
		const after = await request(app.server)
			.get('/me')
			.set('Authorization', `Bearer ${token}`)
			.send()
		expect(after.statusCode).toEqual(401)
	})
})
