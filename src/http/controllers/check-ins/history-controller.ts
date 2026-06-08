import { makeFetchCheckInsHistoryUseCase } from '@/use-cases/factories/make-fetch-check-ins-history-use-case'
import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'

export async function historyController(request: FastifyRequest, reply: FastifyReply) {
	const { sub: userId } = request.user

	const bodySchema = z.object({
		page: z.coerce.number().min(1).default(1),
	})
	const { page } = bodySchema.parse(request.query)

	const fetchCheckInsHistoryUseCase = makeFetchCheckInsHistoryUseCase()

	const { checkIns } = await fetchCheckInsHistoryUseCase.execute({
		userId,
		page,
	})

	return reply.status(200).send({
		checkIns,
	})
}
