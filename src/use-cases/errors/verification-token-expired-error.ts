export class VerificationTokenExpiredError extends Error {
	constructor() {
		super('Verification token has expired.')
		this.name = 'VerificationTokenExpiredError'
	}
}
