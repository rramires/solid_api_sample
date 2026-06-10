import { env } from '@/env'

import { IEmailProvider } from './i-email-provider'

export class ConsoleEmailProvider implements IEmailProvider {
	async sendVerificationEmail(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInHours: number
	}): Promise<void> {
		const { to, linkToken, otpCode, expiresInHours } = params
		const link = `${env.APP_URL}/users/verify-email?token=${linkToken}`

		// In development, print the verification details to stdout so developers
		// can verify their email without a real mail server.
		// TO REPLACE WITH SMTP/SendGrid/Resend: swap this class for a concrete
		// IEmailProvider implementation and update src/lib/email/index.ts.
		console.log(`
📧 [EMAIL VERIFICATION] To: ${to}
   Link   : ${link}
   Code   : ${otpCode}
   Expires: in ${expiresInHours}h
`)
	}

	async sendPasswordResetEmail(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInMinutes: number
	}): Promise<void> {
		const { to, linkToken, otpCode, expiresInMinutes } = params
		const link = `${env.APP_URL}/users/reset-password?token=${linkToken}`

		// In development, print the reset details to stdout. The link/code are the
		// RAW values; only their SHA-256 hashes are persisted.
		// TO REPLACE WITH SMTP/SendGrid/Resend: swap this class for a concrete
		// IEmailProvider implementation and update src/lib/email/index.ts.
		console.log(`
📧 [PASSWORD RESET] To: ${to}
   Link   : ${link}
   Code   : ${otpCode}
   Expires: in ${expiresInMinutes}min
`)
	}
}
