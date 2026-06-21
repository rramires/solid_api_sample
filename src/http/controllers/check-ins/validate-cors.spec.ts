import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'

describe('CORS preflight (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	// Regression: @fastify/cors defaults methods to 'GET,HEAD,POST', which silently
	// blocks every PATCH/PUT/DELETE at the browser preflight. The validate route is
	// PATCH, so its preflight must advertise PATCH in Access-Control-Allow-Methods —
	// otherwise the browser aborts the request before it reaches the server.
	it('should allow PATCH on the preflight response', async () => {
		const response = await request(app.server)
			.options('/check-ins/some-id/validate')
			.set('Origin', 'http://localhost:3001')
			.set('Access-Control-Request-Method', 'PATCH')
			.set('Access-Control-Request-Headers', 'authorization')

		expect(response.statusCode).toEqual(204)
		expect(response.headers['access-control-allow-methods']).toContain(
			'PATCH',
		)
	})
})
