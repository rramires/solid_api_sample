import { FastifyInstance } from 'fastify'

import { strictAuthLimit } from '@/http/middlewares/rate-limit'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'

import { authenticateController } from './authenticate-controller'
import { helloController } from './hello-controller'
import { profileController } from './profile-controller'
import { refreshController } from './refresh-controller'
import { registerController } from './register-controller'

export async function usersRoutes(app: FastifyInstance) {
	/**
	 * Unauthenticated routes
	 */
	app.get('/hello', helloController)
	//
	app.post('/users', { onRequest: [strictAuthLimit(app)] }, registerController)
	app.post(
		'/sessions',
		{ onRequest: [strictAuthLimit(app)] },
		authenticateController,
	)
	//
	app.patch('/token/refresh', refreshController)
	/**
	 * Authenticated routes
	 */
	app.get('/me', { onRequest: [verifyJwtMiddleware] }, profileController)
}
