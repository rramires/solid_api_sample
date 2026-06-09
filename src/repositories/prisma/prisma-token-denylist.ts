import { prisma } from '@/lib/prisma'

import { TokenDenylist } from '../i-token-denylist'

// Sweep expired entries from RAM and DB once per hour.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

// Hybrid denylist (RAM + database), no Redis required.
// - Reads hit only the in-memory mirror, so the hot path (every request) is ~0 cost.
// - `revoke` persists to the DB and updates the mirror, so revocations survive restarts.
// - `load` warms the mirror from the DB on boot and starts a periodic prune.
export class PrismaTokenDenylist implements TokenDenylist {
	private revoked = new Map<string, Date>()

	async isRevoked(jti: string) {
		return this.revoked.has(jti)
	}

	async revoke(jti: string, expiresAt: Date) {
		await prisma.revokedToken.create({
			data: { jti, expires_at: expiresAt },
		})
		this.revoked.set(jti, expiresAt)
	}

	async load() {
		await this.prune()

		const tokens = await prisma.revokedToken.findMany()
		for (const token of tokens) {
			this.revoked.set(token.jti, token.expires_at)
		}

		// Keep the store bounded over time. unref() so it never blocks shutdown.
		const cleanup = setInterval(() => {
			void this.prune()
		}, CLEANUP_INTERVAL_MS)
		cleanup.unref()
	}

	// Drop tokens that have already expired (they can no longer authenticate).
	private async prune() {
		const now = new Date()
		for (const [jti, expiresAt] of this.revoked) {
			if (expiresAt < now) {
				this.revoked.delete(jti)
			}
		}
		await prisma.revokedToken.deleteMany({
			where: { expires_at: { lt: now } },
		})
	}
}
