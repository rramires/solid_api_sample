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

	it('should be able to register', async () => {
		// create user
		const response = await request(app.server).post('/users').send(user)

		expect(response.statusCode).toEqual(201)
	})
})
