import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { LateCheckInValidationError } from '@/use-cases/errors/late-check-in-validation-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeValidateCheckInUseCase } from '@/use-cases/factories/make-validate-check-in-use-case'

export async function validateController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const paramsSchema = z.object({
		checkInId: z.uuid(),
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
		// Expected business outcome (not a server fault): the 20-minute
		// validation window has elapsed → 409.
		if (err instanceof LateCheckInValidationError) {
			return reply.status(409).send({ message: err.message })
		}
		throw err
	}
}
