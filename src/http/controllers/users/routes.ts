import { FastifyInstance } from 'fastify'

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
	app.post('/users', registerController)
	app.post('/sessions', authenticateController)
	//
	app.patch('/token/refresh', refreshController)
	/**
	 * Authenticated routes
	 */
	app.get('/me', { onRequest: [verifyJwtMiddleware] }, profileController)
}
