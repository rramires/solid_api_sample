import { FastifyReply, FastifyRequest } from 'fastify'

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
		throw err
	}
}
