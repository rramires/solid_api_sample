import { describe, beforeAll, afterAll, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '@/app'

const user = {
	name: 'John Doe',
	email: 'johndoe@example.com',
	password: '123456',
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
		const authResponse = await request(app.server).post('/sessions').send({
			email: user.email,
			password: user.password,
		})

		// get header cookies
		const cookies = authResponse.get('Set-Cookie')

		// refresh cookie
		const response = await request(app.server)
			.patch('/token/refresh')
			.set('Cookie', cookies || [])
			.send()

		expect(response.status).toEqual(200)
		expect(response.body).toEqual({
			token: expect.any(String),
		})
		expect(response.get('Set-Cookie')).toEqual([expect.stringContaining('refreshToken=')])
	})
})
