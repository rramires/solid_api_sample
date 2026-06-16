import { ILoginAttemptTracker } from '../i-login-attempt-tracker'

interface AttemptRecord {
	count: number
	lockedUntil: Date | null
}

export class InMemoryLoginAttemptTracker implements ILoginAttemptTracker {
	private store = new Map<string, AttemptRecord>()
	private readonly maxAttempts: number
	private readonly lockoutMs: number

	constructor(maxAttempts = 5, lockoutMinutes = 15) {
		this.maxAttempts = maxAttempts
		this.lockoutMs = lockoutMinutes * 60 * 1000
		// Cleanup expired entries periodically to prevent memory growth in long-running
		// processes. unref() ensures this timer does not keep the process alive.
		const interval = setInterval(() => this.cleanup(), 10 * 60 * 1000)
		interval.unref()
	}

	async isLocked(email: string): Promise<boolean> {
		const record = this.store.get(email)
		if (!record?.lockedUntil) {
			return false
		}
		if (record.lockedUntil > new Date()) {
			return true
		}
		// Lockout expired — remove stale record.
		this.store.delete(email)
		return false
	}

	async recordFailure(email: string): Promise<void> {
		const record = this.store.get(email) ?? { count: 0, lockedUntil: null }
		record.count += 1
		if (record.count >= this.maxAttempts) {
			record.lockedUntil = new Date(Date.now() + this.lockoutMs)
		}
		this.store.set(email, record)
	}

	async clearAttempts(email: string): Promise<void> {
		this.store.delete(email)
	}

	private cleanup(): void {
		const now = new Date()
		for (const [email, record] of this.store.entries()) {
			if (record.lockedUntil && record.lockedUntil <= now) {
				this.store.delete(email)
			}
		}
	}
}
