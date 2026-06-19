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

	async sendEmailChangeConfirmation(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInHours: number
	}): Promise<void> {
		const { to, linkToken, otpCode, expiresInHours } = params
		const link = `${env.APP_URL}/users/confirm-email-change?token=${linkToken}`

		// Sent to the NEW address — clicking the link / entering the code proves
		// the user controls it, which is what flips is_verified back to true.
		// TO REPLACE WITH SMTP/SendGrid/Resend: swap this class for a concrete
		// IEmailProvider implementation and update src/lib/email/index.ts.
		console.log(`
📧 [EMAIL CHANGE] To: ${to}
   Link   : ${link}
   Code   : ${otpCode}
   Expires: in ${expiresInHours}h
`)
	}

	async sendEmailChangeAlert(params: {
		to: string
		newEmail: string
	}): Promise<void> {
		const { to, newEmail } = params

		// Sent to the OLD (still-proven) address as an anti-hijack notice: if the
		// account owner didn't request the change, they can react before it is
		// confirmed (the old email stays valid until then).
		console.log(`
📧 [EMAIL CHANGE REQUESTED] To: ${to}
   A change to "${newEmail}" was requested.
   If this wasn't you, change your password immediately — the change is
   not applied until the new address is confirmed.
`)
	}
}
