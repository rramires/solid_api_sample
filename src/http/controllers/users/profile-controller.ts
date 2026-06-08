import { FastifyReply,FastifyRequest } from 'fastify'

import { makeGetUserProfileUseCase } from '@/use-cases/factories/make-get-user-profile-use-case'

export async function profileController(request: FastifyRequest, reply: FastifyReply) {
	const getUserProfile = makeGetUserProfileUseCase()

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
}
