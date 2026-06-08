export class MaxCheckInsReachedError extends Error {
	constructor() {
		super('Max check-ins reached.')
	}
}
