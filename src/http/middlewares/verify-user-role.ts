import { FastifyReply, FastifyRequest } from 'fastify'

import { Role } from '@/prisma-client/enums'

function verifyUserRole(roleToVerify: Role) {
	// This middleware checks if the user has the required role
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const { role } = request.user

		if (role !== roleToVerify) {
			// Authenticated but lacking the required role: 403, not 401
			return reply.status(403).send({ message: 'Forbidden.' })
		}
	}
}

export { verifyUserRole }
