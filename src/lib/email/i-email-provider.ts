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
	// Future: sendWelcome, etc.
}
