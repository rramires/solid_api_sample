import { FastifyInstance } from 'fastify'

import { strictAuthLimit } from '@/http/middlewares/rate-limit'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'

import { authenticateController } from './authenticate-controller'
import { forgotPasswordController } from './forgot-password-controller'
import { helloController } from './hello-controller'
import { logoutController } from './logout-controller'
import { profileController } from './profile-controller'
import { refreshController } from './refresh-controller'
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
	 * Unauthenticated routes
	 */
	app.get('/hello', helloController)
	//
	app.post(
		'/users',
		{ onRequest: [strictAuthLimit(app)] },
		registerController,
	)
	app.post(
		'/auth/login',
		{ onRequest: [strictAuthLimit(app)] },
		authenticateController,
	)
	//
	app.patch('/auth/refresh', refreshController)
	// Password reset — both public, behind the strict auth limiter.
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
	// Email verification — public (link click from email)
	app.get('/users/verify-email', verifyEmailByLinkController)
	// Email verification — public (resend without being logged in is not useful;
	// keeping this authenticated so we can read sub from JWT without a body email)
	app.post(
		'/users/resend-verification',
		{ onRequest: [verifyJwtMiddleware] },
		resendVerificationController,
	)
	/**
	 * Authenticated routes
	 */
	app.get('/auth/me', { onRequest: [verifyJwtMiddleware] }, profileController)
	app.post(
		'/auth/logout',
		{ onRequest: [verifyJwtMiddleware] },
		logoutController,
	)
	// Email verification — authenticated
	app.post(
		'/users/send-verification',
		{ onRequest: [verifyJwtMiddleware] },
		sendVerificationController,
	)
	app.post(
		'/users/verify-email/otp',
		{ onRequest: [verifyJwtMiddleware] },
		verifyEmailByOtpController,
	)
}
