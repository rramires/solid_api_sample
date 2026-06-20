import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import { prisma } from '@/lib/prisma'
import { Role } from '@/prisma-client/enums'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

// Local helper: mint a unique admin per test (see check-in-controller.spec.ts).
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

describe('Validate check-in (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to validate a check-in', async () => {
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
		const responseCheckIn = await request(app.server)
			.post(`/gyms/${gymId}/check-ins`)
			.set('Authorization', `Bearer ${token}`)
			.send({
				latitude: coordinates.lat,
				longitude: coordinates.lon,
			})
		const { id: checkInId } = responseCheckIn.body.checkIn

		// validate check-in
		const response = await request(app.server)
			.patch(`/check-ins/${checkInId}/validate`)
			.set('Authorization', `Bearer ${token}`)
			.send()
		const { validated_at } = response.body.checkIn

		expect(response.statusCode).toEqual(200)
		expect(new Date(validated_at).getTime()).toBeGreaterThan(
			new Date(0).getTime(),
		)
	})

	it('should return 409 when validating after the 20-minute window', async () => {
		const token = await createAdmin('lateuser@example.com', 'lateuser')

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

		const responseCheckIn = await request(app.server)
			.post(`/gyms/${gymId}/check-ins`)
			.set('Authorization', `Bearer ${token}`)
			.send({ latitude: coordinates.lat, longitude: coordinates.lon })
		const { id: checkInId } = responseCheckIn.body.checkIn

		// Push creation back beyond the 20-minute window so validation is late.
		await prisma.checkIn.update({
			where: { id: checkInId },
			data: { created_at: new Date(Date.now() - 21 * 60 * 1000) },
		})

		const response = await request(app.server)
			.patch(`/check-ins/${checkInId}/validate`)
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(409)
		expect(response.body.message).toEqual(
			'The check-in can only be validated until 20 minutes of its creation.',
		)
	})
})
