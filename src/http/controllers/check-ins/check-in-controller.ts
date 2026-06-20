import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { MaxCheckInsReachedError } from '@/use-cases/errors/max-check-ins-reached-error'
import { MaxDistanceError } from '@/use-cases/errors/max-distance-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeCheckInUseCase } from '@/use-cases/factories/make-check-in-use-case'

export async function checkInController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { sub: userId } = request.user

	const paramsSchema = z.object({
		gymId: z.uuid(),
	})
	const { gymId } = paramsSchema.parse(request.params)

	const bodySchema = z.object({
		latitude: z.coerce.number().refine((value) => {
			return Math.abs(value) <= 90
		}),
		longitude: z.coerce.number().refine((value) => {
			return Math.abs(value) <= 180
		}),
	})
	const { latitude, longitude } = bodySchema.parse(request.body)

	const checkInUseCase = makeCheckInUseCase()
	try {
		const response = await checkInUseCase.execute({
			userId,
			gymId,
			userLatitude: latitude,
			userLongitude: longitude,
		})
		const { checkIn } = response

		return reply.status(201).send({
			checkIn,
		})
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			return reply.status(404).send({ message: err.message })
		}
		// Expected business outcomes (not server faults): out of the gym's
		// radius → 400; a second check-in on the same day → 409.
		if (err instanceof MaxDistanceError) {
			return reply.status(400).send({ message: err.message })
		}
		if (err instanceof MaxCheckInsReachedError) {
			return reply.status(409).send({ message: err.message })
		}
		throw err
	}
}
