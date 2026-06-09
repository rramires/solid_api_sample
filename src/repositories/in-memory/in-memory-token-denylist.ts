import { TokenDenylist } from '../i-token-denylist'

// Pure in-memory denylist. Serves as a test double and as the reference
// implementation for the interface contract.
export class InMemoryTokenDenylist implements TokenDenylist {
	public items = new Map<string, Date>()

	async isRevoked(jti: string) {
		return this.items.has(jti)
	}

	async revoke(jti: string, expiresAt: Date) {
		this.items.set(jti, expiresAt)
	}

	async load() {
		// Nothing to warm up for the in-memory double.
	}
}
