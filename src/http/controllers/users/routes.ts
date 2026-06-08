import { FastifyInstance } from 'fastify'
import { helloController } from './hello-controller'
import { registerController } from './register-controller'
import { authenticateController } from './authenticate-controller'
import { profileController } from './profile-controller'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'
import { refreshController } from './refresh-controller'

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
