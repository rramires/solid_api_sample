import request from 'supertest'
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from 'vitest'

import { app } from '@/app'

// The console provider prints the RAW link token + OTP (only hashes are stored),
// so the test reads them back by spying on console.log.
let logSpy: ReturnType<typeof vi.spyOn>

function lastResetEmail() {
	const block = logSpy.mock.calls
		.map((c: unknown[]) => String(c[0]))
		.reverse()
		.find((s: string) => s.includes('[PASSWORD RESET]'))
	if (!block) {
		throw new Error('no password-reset email was printed')
	}
	const token = block.match(/token=([0-9a-f-]+)/i)?.[1]
	const code = block.match(/Code\s*:\s*(\d{6})/)?.[1]
	return { token: token!, code: code! }
}

// /auth/login is strict-rate-limited (5/min), so only authenticate when the test
// actually needs the access token; otherwise just register.
async function registerUser(email: string, password: string) {
	await request(app.server)
		.post('/users')
		.send({
			username: email.split('@')[0].replace(/[^a-z0-9_]/gi, '_'),
			email,
			password,
		})
}

async function registerAndAuth(email: string, password: string) {
	await registerUser(email, password)
	const auth = await request(app.server)
		.post('/auth/login')
		.send({ identifier: email, password })
	return auth.body.token as string
}

describe('Reset Password (e2e)', () => {
	beforeAll(async () => {
		await app.ready()
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	})

	afterAll(async () => {
		logSpy.mockRestore()
		await app.close()
	})

	afterEach(() => {
		logSpy.mockClear()
	})

	it('should answer 202 with the same body for known and unknown emails', async () => {
		await registerUser('known@example.com', 'Abc@1234')

		const known = await request(app.server)
			.post('/users/forgot-password')
			.send({ email: 'known@example.com' })
		const unknown = await request(app.server)
			.post('/users/forgot-password')
			.send({ email: 'ghost@example.com' })

		expect(known.statusCode).toEqual(202)
		expect(unknown.statusCode).toEqual(202)
		expect(known.body).toEqual(unknown.body)
	})

	it('should reset via the link, log out old tokens and rotate the password', async () => {
		const email = 'link@example.com'
		const oldToken = await registerAndAuth(email, 'Abc@1234')

		await request(app.server).post('/users/forgot-password').send({ email })
		const { token } = lastResetEmail()

		const reset = await request(app.server)
			.post('/users/reset-password')
			.send({ token, newPassword: 'Newpass@1' })
		expect(reset.statusCode).toEqual(204)

		// Old password no longer works; the new one does.
		const oldLogin = await request(app.server)
			.post('/auth/login')
			.send({ identifier: email, password: 'Abc@1234' })
		expect(oldLogin.statusCode).toEqual(401)

		const newLogin = await request(app.server)
			.post('/auth/login')
			.send({ identifier: email, password: 'Newpass@1' })
		expect(newLogin.statusCode).toEqual(200)

		// Access token issued before the reset is globally invalidated.
		const me = await request(app.server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${oldToken}`)
		expect(me.statusCode).toEqual(401)

		// The reset token is single-use.
		const reuse = await request(app.server)
			.post('/users/reset-password')
			.send({ token, newPassword: 'Another@1' })
		expect(reuse.statusCode).toEqual(400)
	})

	it('should reset via the OTP code', async () => {
		const email = 'otp@example.com'
		await registerUser(email, 'Abc@1234')

		await request(app.server).post('/users/forgot-password').send({ email })
		const { code } = lastResetEmail()

		const reset = await request(app.server)
			.post('/users/reset-password')
			.send({ email, code, newPassword: 'Newpass@1' })
		expect(reset.statusCode).toEqual(204)

		const newLogin = await request(app.server)
			.post('/auth/login')
			.send({ identifier: email, password: 'Newpass@1' })
		expect(newLogin.statusCode).toEqual(200)
	})
})
