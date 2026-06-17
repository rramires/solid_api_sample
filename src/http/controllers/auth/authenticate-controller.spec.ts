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

	it('should be able to authenticate by email', async () => {
		// create user
		await request(app.server).post('/users').send(user)

		// authenticate
		const response = await request(app.server).post('/auth/login').send({
			identifier: user.email,
			password: user.password,
		})

		expect(response.statusCode).toEqual(200)
		expect(response.body).toEqual({
			token: expect.any(String),
		})
	})

	it('should be able to authenticate by username', async () => {
		await request(app.server)
			.post('/users')
			.send({
				...user,
				username: 'janedoe',
				email: 'janedoe@example.com',
			})

		const response = await request(app.server).post('/auth/login').send({
			identifier: 'janedoe',
			password: user.password,
		})

		expect(response.statusCode).toEqual(200)
		expect(response.body).toEqual({
			token: expect.any(String),
		})
	})
})
