import { describe, beforeAll, afterAll, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '@/app'

const user = {
	name: 'John Doe',
	email: 'johndoe@example.com',
	password: '123456',
}

describe('Register (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to authenticate', async () => {
		// create user
		await request(app.server).post('/users').send(user)

		// authenticate
		const response = await request(app.server).post('/sessions').send({
			email: user.email,
			password: user.password,
		})

		expect(response.statusCode).toEqual(200)
		expect(response.body).toEqual({
			token: expect.any(String),
		})
	})
})
