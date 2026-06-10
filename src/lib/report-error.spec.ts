import { describe, expect, it, vi } from 'vitest'

import { app } from '@/app'

import { reportError } from './report-error'

describe('reportError', () => {
	it('should forward the error to the app logger', () => {
		const spy = vi.spyOn(app.log, 'error').mockImplementation(() => {})
		const error = new Error('boom')

		reportError(error)

		expect(spy).toHaveBeenCalledWith(error)
		spy.mockRestore()
	})
})
