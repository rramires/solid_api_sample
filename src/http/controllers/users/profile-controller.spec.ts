import request from 'supertest'
import { afterAll, beforeAll, describe, expect,it } from 'vitest'

import { app } from '@/app'
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
			.get('/me')
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(200)
		expect(response.body.user).toEqual(
			expect.objectContaining({
				name: user.name,
			}),
		)
	})
})
