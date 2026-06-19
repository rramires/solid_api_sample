import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '@/env'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeUpdateGymUseCase } from '@/use-cases/factories/make-update-gym-use-case'

export async function updateController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const paramsSchema = z.object({
		gymId: z.uuid(),
	})
	const { gymId } = paramsSchema.parse(request.params)

	// Whitelist: only the three editable fields, all optional. `.strict()`
	// rejects unknown keys (mass-assignment defense); `.refine` requires at
	// least one field so an empty body is a 400, not a no-op 200.
	const bodySchema = z
		.object({
			title: z.string().min(env.MIN_TEXT_LENGTH).max(100).optional(),
			description: z.string().max(500).nullable().optional(),
			phone: z
				.string()
				.regex(/^\+?[\d\s().-]{7,20}$/, 'invalid phone')
				.nullable()
				.optional(),
		})
		.strict()
		.refine(
			(data) =>
				data.title !== undefined ||
				data.description !== undefined ||
				data.phone !== undefined,
			{ message: 'Provide at least one field to update.' },
		)
	const { title, description, phone } = bodySchema.parse(request.body)

	const updateGymUseCase = makeUpdateGymUseCase()
	try {
		const { gym } = await updateGymUseCase.execute({
			gymId,
			title,
			description,
			phone,
		})

		return reply.status(200).send({
			gym,
		})
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			return reply.status(404).send({ message: err.message })
		}
		throw err
	}
}
