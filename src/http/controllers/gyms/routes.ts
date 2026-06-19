import { FastifyInstance } from 'fastify'

import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'
import { verifyUserRole } from '@/http/middlewares/verify-user-role'
import { Role } from '@/prisma-client'

import { createController } from './create-controller'
import { nearbyController } from './nearby-controller'
import { searchController } from './search-controller'
import { updateController } from './update-controller'

export async function gymsRoutes(app: FastifyInstance) {
	/**
	 * Authenticated routes
	 */
	app.addHook('onRequest', verifyJwtMiddleware)
	//
	app.get('/gyms/search', searchController)
	app.get('/gyms/nearby', nearbyController)
	//
	app.post(
		'/gyms',
		{ onRequest: [verifyUserRole(Role.ADMIN)] },
		createController,
	)
	//
	app.patch(
		'/gyms/:gymId',
		{ onRequest: [verifyUserRole(Role.ADMIN)] },
		updateController,
	)
}
