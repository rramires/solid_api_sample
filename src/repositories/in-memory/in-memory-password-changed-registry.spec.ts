import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryPasswordChangedRegistry } from './in-memory-password-changed-registry'

let sut: InMemoryPasswordChangedRegistry

describe('Password Changed Registry (in-memory)', () => {
	beforeEach(() => {
		sut = new InMemoryPasswordChangedRegistry()
	})

	it('should not invalidate when the user never changed their password', async () => {
		const nowSeconds = Math.floor(Date.now() / 1000)

		expect(await sut.isInvalidated('user-1', nowSeconds)).toBe(false)
	})

	it('should invalidate tokens issued before the password change', async () => {
		const changedAt = new Date()
		await sut.recordChange('user-1', changedAt)

		// Token issued 10s before the change.
		const oldIat = Math.floor(changedAt.getTime() / 1000) - 10

		expect(await sut.isInvalidated('user-1', oldIat)).toBe(true)
	})

	it('should allow tokens issued after the password change', async () => {
		const changedAt = new Date()
		await sut.recordChange('user-1', changedAt)

		// Token issued 10s after the change.
		const newIat = Math.floor(changedAt.getTime() / 1000) + 10

		expect(await sut.isInvalidated('user-1', newIat)).toBe(false)
	})

	it('should scope invalidation to the user who changed the password', async () => {
		const changedAt = new Date()
		await sut.recordChange('user-1', changedAt)

		const oldIat = Math.floor(changedAt.getTime() / 1000) - 10

		expect(await sut.isInvalidated('user-2', oldIat)).toBe(false)
	})
})
