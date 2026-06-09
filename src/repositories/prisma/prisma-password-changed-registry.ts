import { prisma } from '@/lib/prisma'

import { IPasswordChangedRegistry } from '../i-password-changed-registry'

// Sweep stale entries once per hour.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000
// Max refresh-token lifetime. A password change older than this can no longer
// invalidate any still-valid token, so it need not be tracked in memory.
const MAX_TOKEN_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Hybrid registry (RAM + database), mirroring PrismaTokenDenylist.
// - Reads hit only the in-memory mirror, so the hot path (every request) is ~0 cost.
// - The password_changed_at column is the durable source of truth (written with
//   the new password hash); `load` warms the mirror from it and prunes hourly.
export class PrismaPasswordChangedRegistry implements IPasswordChangedRegistry {
	private changedAt = new Map<string, Date>()

	async isInvalidated(userId: string, iatSeconds: number) {
		const changed = this.changedAt.get(userId)
		if (!changed) {
			return false
		}
		// Reject tokens issued before the last password change. `iat` has second
		// granularity; comparing in ms biases slightly toward rejecting a token
		// minted in the same second as the change — a harmless forced re-login.
		return iatSeconds * 1000 < changed.getTime()
	}

	async recordChange(userId: string, changedAt: Date) {
		// RAM mirror only — the password_changed_at column is written atomically
		// with the new password_hash by the caller (usersRepository.update).
		this.changedAt.set(userId, changedAt)
	}

	async load() {
		this.prune()

		const since = new Date(Date.now() - MAX_TOKEN_AGE_MS)
		const users = await prisma.user.findMany({
			where: { password_changed_at: { gte: since } },
			select: { id: true, password_changed_at: true },
		})
		for (const user of users) {
			if (user.password_changed_at) {
				this.changedAt.set(user.id, user.password_changed_at)
			}
		}

		// Keep the store bounded. unref() so it never blocks shutdown.
		const cleanup = setInterval(() => this.prune(), CLEANUP_INTERVAL_MS)
		cleanup.unref()
	}

	// Drop changes old enough that every token predating them has expired anyway.
	private prune() {
		const cutoff = Date.now() - MAX_TOKEN_AGE_MS
		for (const [userId, changed] of this.changedAt) {
			if (changed.getTime() < cutoff) {
				this.changedAt.delete(userId)
			}
		}
	}
}
