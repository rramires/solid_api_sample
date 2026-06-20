import { FastifyReply, FastifyRequest } from 'fastify'

import { Role } from '@/prisma-client/enums'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeGetUserProfileUseCase } from '@/use-cases/factories/make-get-user-profile-use-case'

function verifyUserRole(roleToVerify: Role) {
	// Authorization reads the role from the DATABASE (by the authenticated user's
	// id), never from the JWT `role` claim. A role change — e.g. an admin
	// demoting a user — therefore takes effect on the very next request instead
	// of lingering until the access token (and its rotating refresh token)
	// expires. Mirrors how the profile controller reads `is_verified`/`role`
	// fresh from the DB; the signed `role` claim is never trusted for access
	// control. Runs after verifyJwtMiddleware, so `request.user.sub` is set.
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const getUserProfile = makeGetUserProfileUseCase()

		try {
			const { user } = await getUserProfile.execute({
				userId: request.user.sub,
			})

			if (user.role !== roleToVerify) {
				// Authenticated but lacking the required role: 403, not 401.
				return reply.status(403).send({ message: 'Forbidden.' })
			}
		} catch (err) {
			if (err instanceof ResourceNotFoundError) {
				// Valid token but the user no longer exists: force re-auth.
				return reply.status(401).send({ message: 'Unauthorized.' })
			}
			throw err
		}
	}
}

export { verifyUserRole }
