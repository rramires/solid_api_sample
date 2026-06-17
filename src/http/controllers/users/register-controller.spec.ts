import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'

const user = {
	username: 'johndoe',
	email: 'johndoe@example.com',
	password: 'Abc@1234',
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

	it('should reject a password that fails the complexity policy', async () => {
		// 'password123' has lower + digit but no uppercase and no special char,
		// so it fails the default PASSWORD_PATTERN.
		const response = await request(app.server)
			.post('/users')
			.send({
				...user,
				username: 'weakpass',
				email: 'weak@example.com',
				password: 'password123',
			})

		expect(response.statusCode).toEqual(400)
	})
})
