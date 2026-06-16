import request from 'supertest'
import { afterAll, beforeAll, describe, expect,it } from 'vitest'

import { app } from '@/app'

const user = {
	username: 'johndoe',
	email: 'johndoe@example.com',
	password: '12345678',
}

describe('Refresh Token (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to refresh a token', async () => {
		// create user
		await request(app.server).post('/users').send(user)

		// authenticate
		const authResponse = await request(app.server).post('/auth/login').send({
			identifier: user.email,
			password: user.password,
		})

		// get header cookies
		const cookies = authResponse.get('Set-Cookie')

		// refresh cookie
		const response = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', cookies || [])
			.send()

		expect(response.status).toEqual(200)
		expect(response.body).toEqual({
			token: expect.any(String),
		})
		expect(response.get('Set-Cookie')).toEqual([expect.stringContaining('refreshToken=')])
	})

	it('should reject reuse of an old refresh cookie (single-use)', async () => {
		const email = 'refresh-reuse@example.com'
		await request(app.server)
			.post('/users')
			.send({ ...user, username: 'refreshreuse', email })

		const authResponse = await request(app.server).post('/auth/login').send({
			identifier: email,
			password: user.password,
		})
		const oldCookies = authResponse.get('Set-Cookie') || []

		// First refresh consumes (rotates) the presented refresh token.
		const first = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', oldCookies)
			.send()
		expect(first.status).toEqual(200)

		// Reusing the SAME, now-rotated cookie must fail.
		const reuse = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', oldCookies)
			.send()
		expect(reuse.status).toEqual(401)
	})
})
