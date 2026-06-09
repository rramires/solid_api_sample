import { IPasswordChangedRegistry } from '../i-password-changed-registry'

// Pure in-memory registry. Test double and reference implementation for the
// IPasswordChangedRegistry contract.
export class InMemoryPasswordChangedRegistry implements IPasswordChangedRegistry {
	public items = new Map<string, Date>()

	async isInvalidated(userId: string, iatSeconds: number) {
		const changed = this.items.get(userId)
		if (!changed) {
			return false
		}
		return iatSeconds * 1000 < changed.getTime()
	}

	async recordChange(userId: string, changedAt: Date) {
		this.items.set(userId, changedAt)
	}

	async load() {
		// Nothing to warm up for the in-memory double.
	}
}
