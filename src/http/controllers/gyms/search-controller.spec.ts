import { describe, beforeAll, afterAll, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'
import getTestCoordinates from '@/utils/tests/get-test-coordinates'

describe('Search Gyms (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to search gyms by title', async () => {
		// get auth user
		const { token } = await createAndAuthUser(app, true)

		// get test positions
		const { coordinates } = getTestCoordinates()

		// create two gyms
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
			latitude: coordinates.lat,
			longitude: coordinates.lon,
		})

		const response = await request(app.server)
			.get('/gyms/search')
			.query({
				query: 'JavaScript',
			})
			.set('Authorization', `Bearer ${token}`)
			.send()

		expect(response.statusCode).toEqual(200)
		expect(response.body.gyms).toHaveLength(1)
		expect(response.body.gyms).toEqual([
			expect.objectContaining({
				title: 'JavaScript Gym',
			}),
		])
	})
})
