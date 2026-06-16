import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '@/env'
import { makeSearchGymsUseCase } from '@/use-cases/factories/make-search-gyms-use-case'

export async function searchController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const bodySchema = z.object({
		query: z.string().min(env.MIN_TEXT_LENGTH),
		page: z.coerce.number().min(1).default(1),
	})
	const { query, page } = bodySchema.parse(request.query)

	const searchGymsUseCase = makeSearchGymsUseCase()
	const { gyms } = await searchGymsUseCase.execute({
		query,
		page,
	})

	return reply.status(200).send({
		gyms,
	})
}
