import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import { prisma } from '@/lib/prisma'
import { Role } from '@/prisma-client/enums'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

// Local helper: mint a unique admin per test. The shared createAndAuthUser
// hard-codes one identity, which collides across `it` blocks sharing this
// file's database; unique users keep the error-path cases independent.
async function createAdmin(email: string, username: string) {
	const { body } = await request(app.server)
		.post('/users')
		.send({ username, email, password: 'Abc@1234' })
	await prisma.user.update({
		where: { id: body.user.id },
		data: { role: Role.ADMIN },
	})
	const auth = await request(app.server)
		.post('/auth/login')
		.send({ identifier: email, password: 'Abc@1234' })
	return auth.body.token as string
}

describe('Check-in (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to create a check-in', async () => {
		// get auth user
		const { token } = await createAndAuthUser(app, true)

		// get test positions
		const { coordinates } = getTestCoordinates()

		// create gym
		const responseGym = await request(app.server)
			.post('/gyms')
			.set('Authorization', `Bearer ${token}`)
			.send({
				title: 'TypeScrypt Gym',
				description: 'Best TS Gyn in the city',
				phone: '9999-8888',
				latitude: coordinates.lat,
				longitude: coordinates.lon,
			})
		const { id: gymId } = responseGym.body.gym

		// create check-in
		const response = await request(app.server)
			.post(`/gyms/${gymId}/check-ins`)
			.set('Authorization', `Bearer ${token}`)
			.send({
				latitude: coordinates.lat,
				longitude: coordinates.lon,
			})

		expect(response.statusCode).toEqual(201)
	})

	it('should return 400 when the user is too far from the gym', async () => {
		const token = await createAdmin('faraway@example.com', 'faraway')

		const { coordinates, coordinatesPlus10km } = getTestCoordinates()

		// create gym at the reference coordinates
		const responseGym = await request(app.server)
			.post('/gyms')
			.set('Authorization', `Bearer ${token}`)
			.send({
				title: 'TypeScrypt Gym',
				description: 'Best TS Gyn in the city',
				phone: '9999-8888',
				latitude: coordinates.lat,
				longitude: coordinates.lon,
			})
		const { id: gymId } = responseGym.body.gym

		// check-in from ~10 km away → outside the 100 m radius
		const response = await request(app.server)
			.post(`/gyms/${gymId}/check-ins`)
			.set('Authorization', `Bearer ${token}`)
			.send({
				latitude: coordinatesPlus10km.lat,
				longitude: coordinatesPlus10km.lon,
			})

		expect(response.statusCode).toEqual(400)
		expect(response.body.message).toEqual('Max distance reached.')
	})

	it('should return 409 on a second check-in the same day', async () => {
		const token = await createAdmin('twice@example.com', 'twice')

		const { coordinates } = getTestCoordinates()

		const responseGym = await request(app.server)
			.post('/gyms')
			.set('Authorization', `Bearer ${token}`)
			.send({
				title: 'TypeScrypt Gym',
				description: 'Best TS Gyn in the city',
				phone: '9999-8888',
				latitude: coordinates.lat,
				longitude: coordinates.lon,
			})
		const { id: gymId } = responseGym.body.gym

		const first = await request(app.server)
			.post(`/gyms/${gymId}/check-ins`)
			.set('Authorization', `Bearer ${token}`)
			.send({ latitude: coordinates.lat, longitude: coordinates.lon })
		expect(first.statusCode).toEqual(201)

		const second = await request(app.server)
			.post(`/gyms/${gymId}/check-ins`)
			.set('Authorization', `Bearer ${token}`)
			.send({ latitude: coordinates.lat, longitude: coordinates.lon })

		expect(second.statusCode).toEqual(409)
		expect(second.body.message).toEqual('Max check-ins reached.')
	})
})
