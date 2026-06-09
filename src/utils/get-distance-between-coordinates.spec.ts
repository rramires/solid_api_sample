import { afterEach, describe, expect, it, vi } from 'vitest'

import { getDistanceBetweenCoordinates } from './get-distance-between-coordinates'

describe('getDistanceBetweenCoordinates', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should return 0 for identical coordinates', () => {
		expect(
			getDistanceBetweenCoordinates(
				{ latitude: -25.4677004, longitude: -49.304584 },
				{ latitude: -25.4677004, longitude: -49.304584 },
			),
		).toBe(0)
	})

	it('should clamp internal dist to 1 on floating-point overflow', () => {
		// Force trig functions to produce dist = 2 (> 1) to exercise the guard
		vi.spyOn(Math, 'sin').mockReturnValue(1)
		vi.spyOn(Math, 'cos').mockReturnValue(1)

		const result = getDistanceBetweenCoordinates(
			{ latitude: 0, longitude: 0 },
			{ latitude: 1, longitude: 0 },
		)
		// dist clamped to 1 → Math.acos(1) = 0 → 0 km
		expect(result).toBe(0)
	})
})
