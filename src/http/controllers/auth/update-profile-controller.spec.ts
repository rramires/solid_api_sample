import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'

describe('Update Profile (e2e)', () => {
	let token: string

	beforeAll(async () => {
		await app.ready()

		const auth = await createAndAuthUser(app)
		token = auth.token

		// A second user owning a username, for the 409 path.
		await request(app.server).post('/users').send({
			username: 'takenname',
			email: 'taken@example.com',
			password: 'Abc@1234',
		})
	})

	afterAll(async () => {
		await app.close()
	})

	it('should let the authenticated user rename themselves (lowercased)', async () => {
		const response = await request(app.server)
			.patch('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send({ username: 'RenamedUser' })

		expect(response.statusCode).toEqual(200)
		expect(response.body.user).toEqual(
			expect.objectContaining({ username: 'renameduser' }),
		)
		// Never leak password_hash or extra internals.
		expect(response.body.user).not.toHaveProperty('password_hash')
	})

	it('should return 409 when the username is taken', async () => {
		const response = await request(app.server)
			.patch('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send({ username: 'takenname' })

		expect(response.statusCode).toEqual(409)
	})

	it('should reject unknown fields (strict) with 400', async () => {
		const response = await request(app.server)
			.patch('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send({ username: 'okname', role: 'ADMIN' })

		expect(response.statusCode).toEqual(400)
	})

	it('should reject a too-short username with 400', async () => {
		const response = await request(app.server)
			.patch('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send({ username: 'ab' })

		expect(response.statusCode).toEqual(400)
	})

	it('should return 401 without a token', async () => {
		const response = await request(app.server)
			.patch('/auth/me')
			.send({ username: 'whatever' })

		expect(response.statusCode).toEqual(401)
	})
})
