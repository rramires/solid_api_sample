export class ResendCooldownError extends Error {
	constructor(public readonly retryAfterSeconds: number) {
		super('Please wait before requesting another verification email.')
		this.name = 'ResendCooldownError'
	}
}
