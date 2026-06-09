import { beforeEach, describe, expect, it } from 'vitest'

import { verifiedCache } from './verified-cache'

describe('Verified cache', () => {
	beforeEach(() => {
		verifiedCache.invalidate('user-1')
	})

	it('should return undefined on a miss', () => {
		expect(verifiedCache.get('user-1')).toBeUndefined()
	})

	it('should store and return the cached value', () => {
		verifiedCache.set('user-1', true)
		expect(verifiedCache.get('user-1')).toBe(true)

		verifiedCache.set('user-1', false)
		expect(verifiedCache.get('user-1')).toBe(false)
	})

	it('should drop the entry on invalidate (forces a re-read)', () => {
		verifiedCache.set('user-1', false)
		verifiedCache.invalidate('user-1')
		expect(verifiedCache.get('user-1')).toBeUndefined()
	})
})
