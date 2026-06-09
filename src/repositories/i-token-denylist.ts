// Token revocation store. Kept async on purpose so the implementation can be
// swapped for Redis (or any networked store) without touching call sites.
export interface TokenDenylist {
	// Whether the token identified by `jti` has been revoked.
	isRevoked(jti: string): Promise<boolean>
	// Revoke a token until `expiresAt` (after that it can be safely forgotten).
	revoke(jti: string, expiresAt: Date): Promise<void>
	// Warm the store on boot (e.g. load persisted revocations into memory).
	load(): Promise<void>
}
