export class AlreadyVerifiedError extends Error {
	constructor() {
		super('Email is already verified.')
		this.name = 'AlreadyVerifiedError'
	}
}
