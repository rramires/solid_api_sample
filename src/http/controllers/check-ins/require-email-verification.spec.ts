import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { app as App } from '@/app'

// Statically importing @/app (or anything that pulls @/env) would parse env
// before the stub. Stub first, then dynamic-import so the verify-email gate is
// active for this file only.
let app: typeof App

describe('Require email verification (e2e)', () => {
	beforeAll(async () => {
		vi.stubEnv('REQUIRE_EMAIL_VERIFICATION', 'true')
		app = (await import('@/app')).app
		await app.ready()
	})

	afterAll(async () => {
		await app.close()
		vi.unstubAllEnvs()
	})

	async function registerAndAuth(email: string) {
		await request(app.server)
			.post('/users')
			.send({
				username: email.split('@')[0].replace(/[^a-z0-9_]/gi, '_'),
				email,
				password: 'Abc@1234',
			})
		const auth = await request(app.server)
			.post('/auth/login')
			.send({ identifier: email, password: 'Abc@1234' })
		return auth.body.token as string
	}

	it('should block an unverified user from checking in (403)', async () => {
		const token = await registerAndAuth('unverified@example.com')

		// The email gate runs before the controller, so a non-existent gym id is
		// irrelevant — an unverified user is rejected outright.
		const response = await request(app.server)
			.post('/gyms/any-gym-id/check-ins')
			.set('Authorization', `Bearer ${token}`)
			.send({ latitude: 0, longitude: 0 })

		expect(response.statusCode).toEqual(403)
	})

	it('should let a verified user past the email gate', async () => {
		const email = 'verified@example.com'
		const token = await registerAndAuth(email)

		// Flip the real verification state in the DB (same path the verify-email
		// flow takes). The middleware reads it through the cache.
		const { prisma } = await import('@/lib/prisma')
		await prisma.user.update({
			where: { email },
			data: { is_verified: true },
		})

		const response = await request(app.server)
			.post('/gyms/any-gym-id/check-ins')
			.set('Authorization', `Bearer ${token}`)
			.send({ latitude: 0, longitude: 0 })

		// Past the email gate: anything but 403 (the gym doesn't exist, so the
		// controller itself fails later — that's fine, the gate let it through).
		expect(response.statusCode).not.toEqual(403)
	})
})
