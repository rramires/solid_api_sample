import { FastifyReply, FastifyRequest } from 'fastify'

import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeGetUserProfileUseCase } from '@/use-cases/factories/make-get-user-profile-use-case'

export async function profileController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const getUserProfile = makeGetUserProfileUseCase()

	try {
		const { user } = await getUserProfile.execute({
			userId: request.user.sub,
		})
		const { id, username, is_verified, role } = user

		// is_verified and role are read fresh from the DB here (not from the JWT
		// claims) so they reflect reality: is_verified clears the moment the user
		// verifies, and role reflects a promotion without waiting for a re-login.
		// The frontend uses is_verified for the "unverified email" banner and role
		// for RBAC UI (e.g. showing ADMIN-only actions).
		return reply.status(200).send({
			user: {
				id,
				username,
				is_verified,
				role,
			},
		})
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			// Valid token but the user no longer exists: force re-authentication
			return reply.status(401).send({ message: err.message })
		}
		throw err
	}
}
