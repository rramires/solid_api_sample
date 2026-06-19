import { randomUUID } from 'node:crypto'

import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

// A second, non-admin user for the 403 path. `createAndAuthUser` always
// registers the same "johndoe", so it can only run once per file — extra
// users are created inline with distinct credentials.
async function registerAndAuth(email: string, username: string) {
	await request(app.server)
		.post('/users')
		.send({ username, email, password: 'Abc@1234' })
	const auth = await request(app.server)
		.post('/auth/login')
		.send({ identifier: email, password: 'Abc@1234' })
	return auth.body.token as string
}

describe('Update Gym (e2e)', () => {
	let adminToken: string
	let memberToken: string
	let gymId: string

	beforeAll(async () => {
		await app.ready()

		const admin = await createAndAuthUser(app, true)
		adminToken = admin.token

		memberToken = await registerAndAuth('member@example.com', 'member')

		const { coordinates } = getTestCoordinates()
		const created = await request(app.server)
			.post('/gyms')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({
				title: 'Old Title',
				description: 'old description',
				phone: '1111-2222',
				latitude: coordinates.lat,
				longitude: coordinates.lon,
			})
		gymId = created.body.gym.id
	})

	afterAll(async () => {
		await app.close()
	})

	it('should let an admin edit a gym', async () => {
		const response = await request(app.server)
			.patch(`/gyms/${gymId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ title: 'New Title', phone: '3333-4444' })

		expect(response.statusCode).toEqual(200)
		expect(response.body.gym).toEqual(
			expect.objectContaining({
				id: gymId,
				title: 'New Title',
				phone: '3333-4444',
			}),
		)
	})

	it('should forbid a non-admin (403)', async () => {
		const response = await request(app.server)
			.patch(`/gyms/${gymId}`)
			.set('Authorization', `Bearer ${memberToken}`)
			.send({ title: 'Hacked' })

		expect(response.statusCode).toEqual(403)
	})

	it('should return 404 for an unknown gym', async () => {
		const response = await request(app.server)
			.patch(`/gyms/${randomUUID()}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ title: 'Whatever' })

		expect(response.statusCode).toEqual(404)
	})

	it('should return 400 when no field is provided', async () => {
		const response = await request(app.server)
			.patch(`/gyms/${gymId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({})

		expect(response.statusCode).toEqual(400)
	})
})
