import { FastifyReply,FastifyRequest } from 'fastify'
import { z } from 'zod'

import { makeValidateCheckInUseCase } from '@/use-cases/factories/make-validate-check-in-use-case'

export async function validateController(request: FastifyRequest, reply: FastifyReply) {
	const paramsSchema = z.object({
		checkInId: z.string().uuid(),
	})
	const { checkInId } = paramsSchema.parse(request.params)

	const validateCheckInUseCase = makeValidateCheckInUseCase()
	const { checkIn } = await validateCheckInUseCase.execute({
		checkInId,
	})

	return reply.status(200).send({
		checkIn,
	})
}
