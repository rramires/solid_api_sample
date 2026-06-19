import { FastifyInstance } from 'fastify'

import { strictAuthLimit } from '@/http/middlewares/rate-limit'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'

import { authenticateController } from './authenticate-controller'
import { confirmEmailChangeByOtpController } from './confirm-email-change-by-otp-controller'
import { logoutController } from './logout-controller'
import { profileController } from './profile-controller'
import { refreshController } from './refresh-controller'
import { requestEmailChangeController } from './request-email-change-controller'
import { updateProfileController } from './update-profile-controller'

export async function authRoutes(app: FastifyInstance) {
	// Public — login is rate-limited; refresh validates the cookie itself.
	app.post(
		'/auth/login',
		{ onRequest: [strictAuthLimit(app)] },
		authenticateController,
	)
	app.patch('/auth/refresh', refreshController)
	// Authenticated
	app.get('/auth/me', { onRequest: [verifyJwtMiddleware] }, profileController)
	app.patch(
		'/auth/me',
		{ onRequest: [verifyJwtMiddleware] },
		updateProfileController,
	)
	// Self-service email change (pattern A): request sends a confirmation to the
	// new address; the OTP confirm proves it. The public link confirm lives in
	// users/routes.ts.
	app.post(
		'/auth/me/email',
		{ onRequest: [verifyJwtMiddleware] },
		requestEmailChangeController,
	)
	app.post(
		'/auth/me/email/confirm',
		{ onRequest: [verifyJwtMiddleware] },
		confirmEmailChangeByOtpController,
	)
	app.post(
		'/auth/logout',
		{ onRequest: [verifyJwtMiddleware] },
		logoutController,
	)
}
