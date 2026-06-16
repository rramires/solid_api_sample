import { FastifyReply, FastifyRequest } from 'fastify'

import { makeGetUserMetricsUseCase } from '@/use-cases/factories/make-get-user-metrics-use-case'

export async function metricsController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { sub: userId } = request.user

	const getUserMetricsUseCase = makeGetUserMetricsUseCase()
	const { checkInsCount } = await getUserMetricsUseCase.execute({
		userId,
	})

	return reply.status(200).send({
		checkInsCount,
	})
}
