import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import { prisma } from '@/lib/prisma'
import { Role } from '@/prisma-client/enums'

const user = {
	username: 'johndoe',
	email: 'johndoe@example.com',
	password: 'Abc@1234',
}

describe('Refresh Token (e2e)', () => {
	beforeAll(async () => {
		// running app
		await app.ready()
	})

	afterAll(async () => {
		// shutdown app
		await app.close()
	})

	it('should be able to refresh a token', async () => {
		// create user
		await request(app.server).post('/users').send(user)

		// authenticate
		const authResponse = await request(app.server)
			.post('/auth/login')
			.send({
				identifier: user.email,
				password: user.password,
			})

		// get header cookies
		const cookies = authResponse.get('Set-Cookie')

		// refresh cookie
		const response = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', cookies || [])
			.send()

		expect(response.status).toEqual(200)
		expect(response.body).toEqual({
			token: expect.any(String),
		})
		expect(response.get('Set-Cookie')).toEqual([
			expect.stringContaining('refreshToken='),
		])
	})

	it('should reject reuse of an old refresh cookie (single-use)', async () => {
		const email = 'refresh-reuse@example.com'
		await request(app.server)
			.post('/users')
			.send({ ...user, username: 'refreshreuse', email })

		const authResponse = await request(app.server)
			.post('/auth/login')
			.send({
				identifier: email,
				password: user.password,
			})
		const oldCookies = authResponse.get('Set-Cookie') || []

		// First refresh consumes (rotates) the presented refresh token.
		const first = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', oldCookies)
			.send()
		expect(first.status).toEqual(200)

		// Reusing the SAME, now-rotated cookie must fail.
		const reuse = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', oldCookies)
			.send()
		expect(reuse.status).toEqual(401)
	})

	it('signs the current DB role on refresh, not the stale token claim', async () => {
		const email = 'refresh-role@example.com'
		const reg = await request(app.server)
			.post('/users')
			.send({ ...user, username: 'refreshrole', email })
		const userId = reg.body.user.id

		const authResponse = await request(app.server)
			.post('/auth/login')
			.send({ identifier: email, password: user.password })
		const cookies = authResponse.get('Set-Cookie') || []

		// Promote in the DB AFTER the refresh token (claiming MEMBER) was issued.
		await prisma.user.update({
			where: { id: userId },
			data: { role: Role.ADMIN },
		})

		const response = await request(app.server)
			.patch('/auth/refresh')
			.set('Cookie', cookies)
			.send()
		expect(response.status).toEqual(200)

		// The rotated access token must carry the fresh DB role (ADMIN), not the
		// stale MEMBER claim copied from the presented refresh token.
		const payload = JSON.parse(
			Buffer.from(
				response.body.token.split('.')[1],
				'base64url',
			).toString(),
		)
		expect(payload.role).toEqual(Role.ADMIN)
	})
})
