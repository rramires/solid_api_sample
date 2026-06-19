import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import { Role } from '@/prisma-client/enums'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'

describe('Profile (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to get user profile', async () => {
		// get auth user
		const { token, user } = await createAndAuthUser(app)

		// get profile
		const response = await request(app.server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(200)
		expect(response.body.user).toEqual(
			expect.objectContaining({
				username: user.username,
				// Freshly registered user is not verified yet — the frontend uses
				// this flag to show the "confirm your email" banner.
				is_verified: false,
				// Default role for a new user; surfaced fresh for RBAC UI.
				role: Role.MEMBER,
			}),
		)
	})

	it('should not be able to get profile of a non-existent user', async () => {
		// Valid token whose subject no longer exists in the database
		const token = app.jwt.sign({
			sub: 'non-existent-user-id',
			role: Role.MEMBER,
		})

		const response = await request(app.server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(401)
	})
})
