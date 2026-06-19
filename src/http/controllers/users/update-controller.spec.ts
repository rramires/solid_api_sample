import { randomUUID } from 'node:crypto'

import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import createAndAuthUser from '@/utils/tests/create-and-auth-user'

async function register(email: string, username: string) {
	const res = await request(app.server)
		.post('/users')
		.send({ username, email, password: 'Abc@1234' })
	return res.body.user as { id: string; username: string; email: string }
}

async function login(email: string) {
	const res = await request(app.server)
		.post('/auth/login')
		.send({ identifier: email, password: 'Abc@1234' })
	return res.body.token as string
}

describe('Update User (e2e)', () => {
	let adminToken: string
	let adminId: string
	let memberToken: string
	let memberId: string

	beforeAll(async () => {
		await app.ready()

		const admin = await createAndAuthUser(app, true)
		adminToken = admin.token
		adminId = admin.user.id

		const member = await register('member@example.com', 'member')
		memberId = member.id
		memberToken = await login('member@example.com')
	})

	afterAll(async () => {
		await app.close()
	})

	it('should forbid a non-admin (403)', async () => {
		const response = await request(app.server)
			.patch(`/users/${memberId}`)
			.set('Authorization', `Bearer ${memberToken}`)
			.send({ username: 'hacked' })

		expect(response.statusCode).toEqual(403)
	})

	it('should return 404 for an unknown user', async () => {
		const response = await request(app.server)
			.patch(`/users/${randomUUID()}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ username: 'whatever' })

		expect(response.statusCode).toEqual(404)
	})

	it('should block an admin from demoting themselves (400)', async () => {
		const response = await request(app.server)
			.patch(`/users/${adminId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ role: 'MEMBER' })

		expect(response.statusCode).toEqual(400)
	})

	it('should reject email + is_verified:true together (400)', async () => {
		const response = await request(app.server)
			.patch(`/users/${memberId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ email: 'whatever@example.com', is_verified: true })

		expect(response.statusCode).toEqual(400)
	})

	it('should let an admin rename a user (200)', async () => {
		const response = await request(app.server)
			.patch(`/users/${memberId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ username: 'editedname' })

		expect(response.statusCode).toEqual(200)
		expect(response.body.user.username).toEqual('editedname')
		expect(response.body.user).not.toHaveProperty('password_hash')
	})

	it('should return 409 for a username already taken', async () => {
		const response = await request(app.server)
			.patch(`/users/${memberId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			// "johndoe" is the admin's own username (from createAndAuthUser).
			.send({ username: 'johndoe' })

		expect(response.statusCode).toEqual(409)
	})

	it('should unverify the account when the email changes (200)', async () => {
		const response = await request(app.server)
			.patch(`/users/${memberId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ email: 'changed@example.com' })

		expect(response.statusCode).toEqual(200)
		expect(response.body.user.email).toEqual('changed@example.com')
		expect(response.body.user.is_verified).toBe(false)
	})
})
