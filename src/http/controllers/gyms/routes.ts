import { FastifyInstance } from 'fastify'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'
import { createController } from './create-controller'
import { searchController } from './search-controller'
import { nearbyController } from './nearby-controller'
import { verifyUserRole } from '@/http/middlewares/verify-user-role'
import { Role } from '@/prisma-client'

export async function gymsRoutes(app: FastifyInstance) {
	/**
	 * Authenticated routes
	 */
	app.addHook('onRequest', verifyJwtMiddleware)
	//
	app.get('/gyms/search', searchController)
	app.get('/gyms/nearby', nearbyController)
	//
	app.post('/gyms', { onRequest: [verifyUserRole(Role.ADMIN)] }, createController)
}
