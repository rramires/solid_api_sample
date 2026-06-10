export class ResetTokenExpiredError extends Error {
	constructor() {
		super('Reset token expired.')
		this.name = 'ResetTokenExpiredError'
	}
}
