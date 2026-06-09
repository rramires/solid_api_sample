// Read-through cache of users' email-verification status, used by the
// verifyEmailVerified middleware so the hot path doesn't hit the DB on every
// request. is_verified only ever flips false -> true (one-way), so entries need
// no TTL: the verify-email controllers set the entry to true on success.
//
// Per-process cache — same multi-instance caveat as the token denylist and the
// login-attempt tracker (swap for Redis via this same seam when scaling out).
class VerifiedCache {
	private cache = new Map<string, boolean>()

	get(userId: string): boolean | undefined {
		return this.cache.get(userId)
	}

	set(userId: string, isVerified: boolean): void {
		this.cache.set(userId, isVerified)
	}

	invalidate(userId: string): void {
		this.cache.delete(userId)
	}
}

export const verifiedCache = new VerifiedCache()
