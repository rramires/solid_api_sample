import { FastifyInstance } from 'fastify'

import { strictAuthLimit } from '@/http/middlewares/rate-limit'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'

import { authenticateController } from './authenticate-controller'
import { helloController } from './hello-controller'
import { logoutController } from './logout-controller'
import { profileController } from './profile-controller'
import { refreshController } from './refresh-controller'
import { registerController } from './register-controller'
import { resendVerificationController } from './resend-verification-controller'
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
		'/sessions',
		{ onRequest: [strictAuthLimit(app)] },
		authenticateController,
	)
	//
	app.patch('/token/refresh', refreshController)
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
	app.get('/me', { onRequest: [verifyJwtMiddleware] }, profileController)
	app.post('/logout', { onRequest: [verifyJwtMiddleware] }, logoutController)
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
