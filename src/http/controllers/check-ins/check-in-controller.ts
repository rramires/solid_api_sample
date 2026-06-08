import { makeCheckInUseCase } from '@/use-cases/factories/make-check-in-use-case'
import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'

export async function checkInController(request: FastifyRequest, reply: FastifyReply) {
	const { sub: userId } = request.user

	const paramsSchema = z.object({
		gymId: z.string().uuid(),
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
}
