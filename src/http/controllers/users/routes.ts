import { FastifyInstance } from 'fastify'

import { strictAuthLimit } from '@/http/middlewares/rate-limit'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'

import { forgotPasswordController } from './forgot-password-controller'
import { registerController } from './register-controller'
import { resendVerificationController } from './resend-verification-controller'
import { resetPasswordController } from './reset-password-controller'
import { sendVerificationController } from './send-verification-controller'
import {
	verifyEmailByLinkController,
	verifyEmailByOtpController,
} from './verify-email-controller'

export async function usersRoutes(app: FastifyInstance) {
	/**
	 * Account management. Auth (login/logout/refresh/me) lives in auth/routes.ts.
	 */
	// Public — registration and password reset, all rate-limited.
	app.post(
		'/users',
		{ onRequest: [strictAuthLimit(app)] },
		registerController,
	)
	app.post(
		'/users/forgot-password',
		{ onRequest: [strictAuthLimit(app)] },
		forgotPasswordController,
	)
	app.post(
		'/users/reset-password',
		{ onRequest: [strictAuthLimit(app)] },
		resetPasswordController,
	)
	// Email verification — link click is public; OTP/send/resend are authenticated.
	app.get('/users/verify-email', verifyEmailByLinkController)
	app.post(
		'/users/send-verification',
		{ onRequest: [verifyJwtMiddleware] },
		sendVerificationController,
	)
	app.post(
		'/users/resend-verification',
		{ onRequest: [verifyJwtMiddleware] },
		resendVerificationController,
	)
	app.post(
		'/users/verify-email/otp',
		{ onRequest: [verifyJwtMiddleware] },
		verifyEmailByOtpController,
	)
}
