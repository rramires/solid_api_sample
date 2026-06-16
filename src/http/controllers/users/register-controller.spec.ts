import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'

const user = {
	username: 'johndoe',
	email: 'johndoe@example.com',
	password: '12345678',
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
