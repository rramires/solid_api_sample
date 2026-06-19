export class CannotChangeOwnRoleError extends Error {
	constructor() {
		super('You cannot change your own role.')
	}
}
