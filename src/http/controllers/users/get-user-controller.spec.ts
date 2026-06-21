import { randomUUID } from 'node:crypto'

import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import { prisma } from '@/lib/prisma'
import { Role } from '@/prisma-client/enums'

// Register a user; return its id and a valid bearer token.
async function createUser(email: string, username: string) {
	const { body } = await request(app.server)
		.post('/users')
		.send({ username, email, password: 'Abc@1234' })
	const auth = await request(app.server)
		.post('/auth/login')
		.send({ identifier: email, password: 'Abc@1234' })
	return { id: body.user.id as string, token: auth.body.token as string }
}

describe('Get user by id (e2e)', () => {
	let adminToken: string
	let memberToken: string
	let targetId: string

	beforeAll(async () => {
		await app.ready()

		// Target user to be fetched (stays a plain MEMBER).
		const target = await createUser('target@example.com', 'targetuser')
		targetId = target.id

		// Admin caller — promote the role in the DB (RBAC reads the DB, not the JWT).
		const admin = await createUser('adminuser@example.com', 'adminuser')
		await prisma.user.update({
			where: { id: admin.id },
			data: { role: Role.ADMIN },
		})
		const adminAuth = await request(app.server)
			.post('/auth/login')
			.send({ identifier: 'adminuser@example.com', password: 'Abc@1234' })
		adminToken = adminAuth.body.token

		// Non-admin caller.
		const member = await createUser('memberuser@example.com', 'memberuser')
		memberToken = member.token
	})

	afterAll(async () => {
		await app.close()
	})

	it('should return 200 with the public user for an admin', async () => {
		const response = await request(app.server)
			.get(`/users/${targetId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send()

		expect(response.statusCode).toEqual(200)
		expect(response.body.user).toEqual({
			id: targetId,
			username: 'targetuser',
			email: 'target@example.com',
			role: 'MEMBER',
			is_verified: false,
			created_at: expect.any(String),
			password_changed_at: null,
		})
		// Never leaks the password hash.
		expect(response.body.user).not.toHaveProperty('password_hash')
	})

	it('should return 404 when the id does not exist', async () => {
		const response = await request(app.server)
			.get(`/users/${randomUUID()}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send()

		expect(response.statusCode).toEqual(404)
		expect(response.body.message).toEqual('Resource not found.')
	})

	it('should return 403 for a non-admin', async () => {
		const response = await request(app.server)
			.get(`/users/${targetId}`)
			.set('Authorization', `Bearer ${memberToken}`)
			.send()

		expect(response.statusCode).toEqual(403)
	})

	it('should return 401 without a token', async () => {
		const response = await request(app.server)
			.get(`/users/${targetId}`)
			.send()

		expect(response.statusCode).toEqual(401)
	})
})
