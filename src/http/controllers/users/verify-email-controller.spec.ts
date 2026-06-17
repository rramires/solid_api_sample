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

// The console provider prints the RAW verification link; the test reads the
// token back by spying on console.log.
let logSpy: ReturnType<typeof vi.spyOn>

function lastVerificationToken() {
	const block = logSpy.mock.calls
		.map((c: unknown[]) => String(c[0]))
		.reverse()
		.find((s: string) => s.includes('[EMAIL VERIFICATION]'))
	if (!block) {
		throw new Error('no verification email was printed')
	}
	return block.match(/token=([0-9a-f-]+)/i)?.[1] as string
}

describe('Verify Email (e2e)', () => {
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

	it('should verify an email via the link and reject a second attempt', async () => {
		const email = 'verify-flow@example.com'
		await request(app.server)
			.post('/users')
			.send({
				username: email.split('@')[0].replace(/[^a-z0-9_]/gi, '_'),
				email,
				password: 'Abc@1234',
			})
		const auth = await request(app.server)
			.post('/auth/login')
			.send({ identifier: email, password: 'Abc@1234' })
		const token = auth.body.token as string

		const send = await request(app.server)
			.post('/users/send-verification')
			.set('Authorization', `Bearer ${token}`)
		expect(send.statusCode).toEqual(204)

		const linkToken = lastVerificationToken()

		const verify = await request(app.server).get(
			`/users/verify-email?token=${linkToken}`,
		)
		expect(verify.statusCode).toEqual(204)

		// Second attempt: the user is already verified.
		const again = await request(app.server).get(
			`/users/verify-email?token=${linkToken}`,
		)
		expect(again.statusCode).toEqual(409)
	})
})
