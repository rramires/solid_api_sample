import { FastifyReply, FastifyRequest } from 'fastify'

import { passwordChangedRegistry } from '@/lib/password-changed-registry'
import { tokenDenylist } from '@/lib/token-denylist'

export async function verifyJwtMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		await request.jwtVerify()
	} catch {
		// 401 - Unauthorized
		return reply.status(401).send({ message: 'Unauthorized.' })
	}

	// Reject tokens that were explicitly revoked (e.g. via logout).
	if (await tokenDenylist.isRevoked(request.user.jti)) {
		return reply.status(401).send({ message: 'Unauthorized.' })
	}

	// Reject every token issued before the user's last password change (global
	// logout after a password reset).
	if (
		await passwordChangedRegistry.isInvalidated(
			request.user.sub,
			request.user.iat,
		)
	) {
		return reply.status(401).send({ message: 'Unauthorized.' })
	}
}
