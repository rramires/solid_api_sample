import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { makeFetchUsersUseCase } from '@/use-cases/factories/make-fetch-users-use-case'

export async function listController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Admin-only (guarded in routes). `page` defaults to 1; responses carry
	// PublicUser[] (never password_hash).
	const querySchema = z.object({
		page: z.coerce.number().int().min(1).default(1),
	})
	const { page } = querySchema.parse(request.query)

	const fetchUsersUseCase = makeFetchUsersUseCase()
	const { users } = await fetchUsersUseCase.execute({ page })

	return reply.status(200).send({ users })
}
