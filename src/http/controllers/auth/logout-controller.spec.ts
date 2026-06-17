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
			.post('/auth/logout')
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(204)
	})

	it('should reject a revoked token after logout', async () => {
		const { token } = await createAndAuthUser(app)

		// The token works before logout.
		const before = await request(app.server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send()
		expect(before.statusCode).toEqual(200)

		// Revoke it.
		await request(app.server)
			.post('/auth/logout')
			.set('Authorization', `Bearer ${token}`)
			.send()

		// The same token is now rejected.
		const after = await request(app.server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send()
		expect(after.statusCode).toEqual(401)
	})

	it('should reject the refresh token after logout', async () => {
		const email = 'logout-refresh@example.com'
		await request(app.server)
			.post('/users')
			.send({
				username: email.split('@')[0].replace(/[^a-z0-9_]/gi, '_'),
				email,
				password: 'Abc@1234',
			})

		const authResponse = await request(app.server)
			.post('/auth/login')
			.send({
				identifier: email,
				password: 'Abc@1234',
			})
		const cookies = authResponse.get('Set-Cookie') || []
		const { token } = authResponse.body

		// Logout with the refresh cookie present revokes BOTH tokens.
		await request(app.server)
			.post('/auth/logout')
			.set('Authorization', `Bearer ${token}`)
			.set('Cookie', cookies)
			.send()

		// The old refresh cookie can no longer rotate.
		const after = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', cookies)
			.send()
		expect(after.statusCode).toEqual(401)
	})
})
