import { FastifyReply,FastifyRequest } from 'fastify'

import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeGetUserProfileUseCase } from '@/use-cases/factories/make-get-user-profile-use-case'

export async function profileController(request: FastifyRequest, reply: FastifyReply) {
	const getUserProfile = makeGetUserProfileUseCase()

	try {
		const { user } = await getUserProfile.execute({
			userId: request.user.sub,
		})
		const { id, name } = user

		return reply.status(200).send({
			user: {
				id,
				name,
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
