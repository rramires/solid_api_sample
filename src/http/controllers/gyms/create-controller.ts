import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '@/env'
import { makeCreateGymUseCase } from '@/use-cases/factories/make-create-gym-use-case'

export async function createController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const bodySchema = z.object({
		title: z.string().min(env.MIN_TEXT_LENGTH).max(100),
		description: z.string().max(500).nullable(),
		// Optional, but if present must look like a phone: 7–20 chars of digits,
		// spaces and the usual separators, optional leading +.
		phone: z
			.string()
			.regex(/^\+?[\d\s().-]{7,20}$/, 'invalid phone')
			.nullable(),
		latitude: z.coerce.number().refine((value) => {
			return Math.abs(value) <= 90
		}),
		longitude: z.coerce.number().refine((value) => {
			return Math.abs(value) <= 180
		}),
	})
	const { title, description, phone, latitude, longitude } = bodySchema.parse(
		request.body,
	)

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
