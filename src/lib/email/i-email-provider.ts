export interface IEmailProvider {
	sendVerificationEmail(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInHours: number
	}): Promise<void>
	sendPasswordResetEmail(params: {
		to: string
		// RAW values — only their SHA-256 hashes are stored in the database.
		linkToken: string
		otpCode: string
		expiresInMinutes: number
	}): Promise<void>
	// Self-service email change (pattern A). Confirmation goes to the NEW address
	// (proving control of it); the alert goes to the OLD address (anti-hijack
	// notice). For email change the token/OTP are stored RAW, like verification.
	sendEmailChangeConfirmation(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInHours: number
	}): Promise<void>
	sendEmailChangeAlert(params: {
		to: string
		newEmail: string
	}): Promise<void>
	// Future: sendWelcome, etc.
}
