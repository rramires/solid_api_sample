import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

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
		throw err
	}
}
