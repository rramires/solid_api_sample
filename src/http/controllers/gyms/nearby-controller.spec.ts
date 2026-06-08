import { describe, beforeAll, afterAll, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

describe('Nearby Gyms (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to list nearby gyms', async () => {
		// get auth user
		const { token } = await createAndAuthUser(app, true)

		// get test positions
		const { coordinates, coordinatesPlus5km, coordinatesPlus10km } = getTestCoordinates()

		// create three gyms
		await request(app.server).post('/gyms').set('Authorization', `Bearer ${token}`).send({
			title: 'TypeScrypt Gym',
			description: 'Best TS Gyn in the city',
			phone: '9999-8888',
			latitude: coordinates.lat,
			longitude: coordinates.lon,
		})

		await request(app.server).post('/gyms').set('Authorization', `Bearer ${token}`).send({
			title: 'JavaScript Gym',
			description: 'Best JS Gyn in the city',
			phone: '8888-7777',
			latitude: coordinatesPlus5km.lat,
			longitude: coordinatesPlus5km.lon,
		})

		await request(app.server).post('/gyms').set('Authorization', `Bearer ${token}`).send({
			title: 'JavaScript Gym',
			description: 'Best JS Gyn in the city',
			phone: '8888-7777',
			latitude: coordinatesPlus10km.lat,
			longitude: coordinatesPlus10km.lon,
		})

		const response = await request(app.server)
			.get('/gyms/nearby')
			.query({
				latitude: coordinates.lat,
				longitude: coordinates.lon,
			})
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(200)
		expect(response.body.gyms).toHaveLength(2)
		expect(response.body.gyms).toEqual([
			expect.objectContaining({ title: 'TypeScrypt Gym' }),
			expect.objectContaining({ title: 'JavaScript Gym' }),
		])
	})
})
