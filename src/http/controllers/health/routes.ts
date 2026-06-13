import { FastifyInstance } from 'fastify'

import { helloController } from './hello-controller'

export async function healthRoutes(app: FastifyInstance) {
	app.get('/hello', helloController)
}
