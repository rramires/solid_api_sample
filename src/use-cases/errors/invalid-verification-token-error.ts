export class InvalidVerificationTokenError extends Error {
	constructor() {
		super('Verification token is invalid or has already been used.')
		this.name = 'InvalidVerificationTokenError'
	}
}
