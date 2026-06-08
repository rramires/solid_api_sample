import { FastifyInstance } from 'fastify'
import { verifyJwtMiddleware } from '@/http/middlewares/verify-jwt-middleware'
import { checkInController } from './check-in-controller'
import { validateController } from './validate-controller'
import { historyController } from './history-controller'
import { metricsController } from './metrics-controller'
import { verifyUserRole } from '@/http/middlewares/verify-user-role'
import { Role } from '@/prisma-client'

export async function checkInsRoutes(app: FastifyInstance) {
	/**
	 * Authenticated routes
	 */
	app.addHook('onRequest', verifyJwtMiddleware)
	//
	app.get('/check-ins/history', historyController)
	app.get('/check-ins/metrics', metricsController)
	//
	app.post('/gyms/:gymId/check-ins', checkInController)
	//
	app.patch(
		'/check-ins/:checkInId/validate',
		{ onRequest: [verifyUserRole(Role.ADMIN)] },
		validateController,
	)
}
