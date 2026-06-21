import { FastifyInstance } from 'fastify'

import { strictAuthLimit } from '@/http/middlewares/rate-limit'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'
import { verifyUserRole } from '@/http/middlewares/verify-user-role'
import { Role } from '@/prisma-client'

import { confirmEmailChangeByLinkController } from './confirm-email-change-by-link-controller'
import { forgotPasswordController } from './forgot-password-controller'
import { getUserController } from './get-user-controller'
import { listController } from './list-controller'
import { registerController } from './register-controller'
import { resendVerificationController } from './resend-verification-controller'
import { resetPasswordController } from './reset-password-controller'
import { sendVerificationController } from './send-verification-controller'
import { updateController } from './update-controller'
import {
	verifyEmailByLinkController,
	verifyEmailByOtpController,
} from './verify-email-controller'

export async function usersRoutes(app: FastifyInstance) {
	/**
	 * Account management. Auth (login/logout/refresh/me) lives in auth/routes.ts.
	 */
	// Admin-only — list users (paginated). Role guard runs in onRequest, so a
	// non-admin gets 403 regardless of query.
	app.get(
		'/users',
		{ onRequest: [verifyJwtMiddleware, verifyUserRole(Role.ADMIN)] },
		listController,
	)
	// Admin-only — fetch a single user by id (PublicUser; never password_hash).
	// 404 when the id does not exist. Backs the admin user-detail page.
	app.get(
		'/users/:userId',
		{ onRequest: [verifyJwtMiddleware, verifyUserRole(Role.ADMIN)] },
		getUserController,
	)
	// Admin-only — edit a user (username/email/role/is_verified). Changing the
	// email unverifies the account and triggers a password reset to the new
	// address; an admin cannot demote themselves.
	app.patch(
		'/users/:userId',
		{ onRequest: [verifyJwtMiddleware, verifyUserRole(Role.ADMIN)] },
		updateController,
	)
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
	// Email change — public link confirm (the token is the proof). The request
	// and OTP confirm are authenticated and live in auth/routes.ts.
	app.get('/users/confirm-email-change', confirmEmailChangeByLinkController)
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
