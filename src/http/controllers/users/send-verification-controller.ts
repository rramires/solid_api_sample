import { FastifyReply, FastifyRequest } from 'fastify'

import { ResendCooldownError } from '@/use-cases/errors/resend-cooldown-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { makeSendVerificationUseCase } from '@/use-cases/factories/make-send-verification-use-case'

export async function sendVerificationController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const useCase = makeSendVerificationUseCase()
		await useCase.execute({ userId: request.user.sub })
		return reply.status(204).send()
	} catch (err) {
		if (err instanceof ResourceNotFoundError) {
			return reply.status(404).send({ message: err.message })
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
