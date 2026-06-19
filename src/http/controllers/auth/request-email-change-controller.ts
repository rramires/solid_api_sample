import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { ResendCooldownError } from '@/use-cases/errors/resend-cooldown-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { makeRequestEmailChangeUseCase } from '@/use-cases/factories/make-request-email-change-use-case'

export async function requestEmailChangeController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Self-service: acts on request.user.sub. Confirmation goes to the new
	// address; the current email stays valid until it's confirmed (pattern A).
	const bodySchema = z.object({
		email: z.email(),
	})
	const { email } = bodySchema.parse(request.body)

	try {
		const useCase = makeRequestEmailChangeUseCase()
		await useCase.execute({ userId: request.user.sub, newEmail: email })
		return reply.status(204).send()
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			return reply.status(404).send({ message: err.message })
		}
		if (err instanceof UserAlreadyExistsError) {
			return reply.status(409).send({ message: err.message })
		}
		if (err instanceof ResendCooldownError) {
			return reply.status(429).send({
				message: err.message,
				retryAfter: err.retryAfterSeconds,
			})
		}
		throw err
	}
}
