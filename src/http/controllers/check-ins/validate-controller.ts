import { FastifyReply,FastifyRequest } from 'fastify'
import { z } from 'zod'

import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeValidateCheckInUseCase } from '@/use-cases/factories/make-validate-check-in-use-case'

export async function validateController(request: FastifyRequest, reply: FastifyReply) {
	const paramsSchema = z.object({
		checkInId: z.string().uuid(),
	})
	const { checkInId } = paramsSchema.parse(request.params)

	const validateCheckInUseCase = makeValidateCheckInUseCase()
	try {
		const { checkIn } = await validateCheckInUseCase.execute({
			checkInId,
		})

		return reply.status(200).send({
			checkIn,
		})
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			return reply.status(404).send({ message: err.message })
		}
		throw err
	}
}
