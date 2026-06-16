import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'

// Regression suite for the global error handler. Framework errors carry a
// meaningful statusCode (429/413/400/...) that must reach the client instead of
// being clobbered into a generic 500.
describe('Global error handler (e2e)', () => {
	beforeAll(async () => {
		await app.ready()
	})

	afterAll(async () => {
		await app.close()
	})

	it('should return 429 when the strict auth limit is exceeded', async () => {
		// strictAuthLimit on /auth/login allows 5/min; the 6th hit must throttle.
		let lastStatus = 0
		for (let i = 0; i < 6; i++) {
			const response = await request(app.server)
				.post('/auth/login')
				.send({
					identifier: 'nobody@example.com',
					password: 'wrong-password',
				})
			lastStatus = response.statusCode
		}

		expect(lastStatus).toEqual(429)
	})

	it('should return 413 when the request body exceeds BODY_LIMIT', async () => {
		const response = await request(app.server)
			.post('/users')
			.send({
				username: 'x'.repeat(20_000), // BODY_LIMIT defaults to 16_384 bytes
				email: 'big@example.com',
				password: '12345678',
			})

		expect(response.statusCode).toEqual(413)
	})

	it('should return 400 when the JSON body is malformed', async () => {
		const response = await request(app.server)
			.post('/users')
			.set('Content-Type', 'application/json')
			.send('{"email":') // truncated, invalid JSON

		expect(response.statusCode).toEqual(400)
	})

	it('should return 404 for an unknown route', async () => {
		const response = await request(app.server).get('/does-not-exist')

		expect(response.statusCode).toEqual(404)
	})
})
