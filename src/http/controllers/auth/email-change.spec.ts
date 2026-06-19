import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '@/app'
import { prisma } from '@/lib/prisma'

async function register(email: string, username: string) {
	const res = await request(app.server)
		.post('/users')
		.send({ username, email, password: 'Abc@1234' })
	return res.body.user as { id: string }
}

async function login(email: string) {
	const res = await request(app.server)
		.post('/auth/login')
		.send({ identifier: email, password: 'Abc@1234' })
	return res.body.token as string
}

describe('Email Change (e2e)', () => {
	beforeAll(async () => {
		await app.ready()
	})

	afterAll(async () => {
		await app.close()
	})

	it('should change the email via the confirmation link', async () => {
		const user = await register('link-old@example.com', 'linkuser')
		const token = await login('link-old@example.com')

		const requested = await request(app.server)
			.post('/auth/me/email')
			.set('Authorization', `Bearer ${token}`)
			.send({ email: 'link-new@example.com' })
		expect(requested.statusCode).toEqual(204)

		// The proven email is untouched until confirmation (pattern A).
		const pending = await prisma.user.findUnique({ where: { id: user.id } })
		expect(pending?.email).toEqual('link-old@example.com')

		const record = await prisma.emailChange.findFirst({
			where: { user_id: user.id },
			orderBy: { created_at: 'desc' },
		})

		const confirmed = await request(app.server).get(
			`/users/confirm-email-change?token=${record?.link_token}`,
		)
		expect(confirmed.statusCode).toEqual(204)

		const fresh = await prisma.user.findUnique({ where: { id: user.id } })
		expect(fresh?.email).toEqual('link-new@example.com')
		expect(fresh?.is_verified).toBe(true)
	})

	it('should change the email via OTP', async () => {
		const user = await register('otp-old@example.com', 'otpuser')
		const token = await login('otp-old@example.com')

		await request(app.server)
			.post('/auth/me/email')
			.set('Authorization', `Bearer ${token}`)
			.send({ email: 'otp-new@example.com' })

		const record = await prisma.emailChange.findFirst({
			where: { user_id: user.id },
			orderBy: { created_at: 'desc' },
		})

		const confirmed = await request(app.server)
			.post('/auth/me/email/confirm')
			.set('Authorization', `Bearer ${token}`)
			.send({ code: record?.otp_code })
		expect(confirmed.statusCode).toEqual(204)

		const fresh = await prisma.user.findUnique({ where: { id: user.id } })
		expect(fresh?.email).toEqual('otp-new@example.com')
	})

	it('should return 409 when the new email is already taken', async () => {
		await register('blocker@example.com', 'blocker')
		await register('conflict-old@example.com', 'conflictuser')
		const token = await login('conflict-old@example.com')

		const response = await request(app.server)
			.post('/auth/me/email')
			.set('Authorization', `Bearer ${token}`)
			.send({ email: 'blocker@example.com' })

		expect(response.statusCode).toEqual(409)
	})

	it('should return 401 without a token', async () => {
		const response = await request(app.server)
			.post('/auth/me/email')
			.send({ email: 'whatever@example.com' })

		expect(response.statusCode).toEqual(401)
	})
})
