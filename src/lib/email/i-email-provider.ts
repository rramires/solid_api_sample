export interface IEmailProvider {
	sendVerificationEmail(params: {
		to: string
		linkToken: string
		otpCode: string
		expiresInHours: number
	}): Promise<void>
	// Future: sendPasswordReset, sendWelcome, etc.
}
