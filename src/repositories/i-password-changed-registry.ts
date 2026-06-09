// Tracks the instant each user last changed their password, so access/refresh
// tokens issued before that instant can be rejected wholesale (global logout).
// The jti denylist cannot express "every token of user X" — this can.
//
// Kept async so the implementation can be swapped for Redis (same seam as the
// token denylist) without touching call sites.
export interface IPasswordChangedRegistry {
	// true if a token issued at `iatSeconds` predates the user's last password
	// change and must therefore be rejected.
	isInvalidated(userId: string, iatSeconds: number): Promise<boolean>
	// Record (in the RAM mirror) that the user changed their password at
	// `changedAt`. The persistent password_changed_at column is written
	// atomically with the new password hash by the caller.
	recordChange(userId: string, changedAt: Date): Promise<void>
	// Warm the mirror on boot from users changed within the max token lifetime.
	load(): Promise<void>
}
