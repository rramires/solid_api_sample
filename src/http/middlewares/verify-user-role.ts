import { Role } from '@/prisma-client/enums'
import { FastifyReply, FastifyRequest } from 'fastify'

function verifyUserRole(roleToVerify: Role) {
	// This middleware checks if the user has the required role
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const { role } = request.user

		if (role !== roleToVerify) {
			return reply.status(401).send({ message: 'Unauthorized.' })
		}
	}
}

export { verifyUserRole }
