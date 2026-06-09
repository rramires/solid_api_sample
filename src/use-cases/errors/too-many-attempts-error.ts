export class TooManyAttemptsError extends Error {
	constructor() {
		super('Too many login attempts. Please try again later.')
		this.name = 'TooManyAttemptsError'
	}
}
