export interface ILoginAttemptTracker {
	isLocked(email: string): Promise<boolean>
	recordFailure(email: string): Promise<void>
	clearAttempts(email: string): Promise<void>
}
