import { FastifyReply,FastifyRequest } from 'fastify'
import { z } from 'zod'

import { makeCreateGymUseCase } from '@/use-cases/factories/make-create-gym-use-case'

export async function createController(request: FastifyRequest, reply: FastifyReply) {
	const bodySchema = z.object({
		title: z.string().min(1).max(100),
		description: z.string().max(500).nullable(),
		phone: z.string().max(20).nullable(),
		latitude: z.coerce.number().refine((value) => {
			return Math.abs(value) <= 90
		}),
		longitude: z.coerce.number().refine((value) => {
			return Math.abs(value) <= 180
		}),
	})
	const { title, description, phone, latitude, longitude } = bodySchema.parse(request.body)

	const createGymUseCase = makeCreateGymUseCase()
	const { gym } = await createGymUseCase.execute({
		title,
		description,
		phone,
		latitude,
		longitude,
	})

	return reply.status(201).send({
		gym,
	})
}
