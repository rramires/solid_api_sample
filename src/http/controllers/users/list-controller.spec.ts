import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'

// A second, non-admin user for the 403 path (see update-controller.spec for
// why createAndAuthUser can only run once per file).
async function registerAndAuth(email: string, username: string) {
	await request(app.server)
		.post('/users')
		.send({ username, email, password: 'Abc@1234' })
	const auth = await request(app.server)
		.post('/auth/login')
		.send({ identifier: email, password: 'Abc@1234' })
	return auth.body.token as string
}

describe('List Users (e2e)', () => {
	let adminToken: string
	let memberToken: string

	beforeAll(async () => {
		await app.ready()
		const admin = await createAndAuthUser(app, true)
		adminToken = admin.token
		memberToken = await registerAndAuth('member@example.com', 'member')
	})

	afterAll(async () => {
		await app.close()
	})

	it('should let an admin list users', async () => {
		const response = await request(app.server)
			.get('/users')
			.set('Authorization', `Bearer ${adminToken}`)

		expect(response.statusCode).toEqual(200)
		expect(Array.isArray(response.body.users)).toBe(true)
		expect(response.body.users.length).toBeGreaterThanOrEqual(2)
		expect(response.body.users[0]).not.toHaveProperty('password_hash')
	})

	it('should forbid a non-admin (403)', async () => {
		const response = await request(app.server)
			.get('/users')
			.set('Authorization', `Bearer ${memberToken}`)

		expect(response.statusCode).toEqual(403)
	})

	it('should return 401 without a token', async () => {
		const response = await request(app.server).get('/users')
		expect(response.statusCode).toEqual(401)
	})
})
