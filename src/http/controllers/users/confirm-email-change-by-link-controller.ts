import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { verifiedCache } from '@/lib/verified-cache'
import { InvalidVerificationTokenError } from '@/use-cases/errors/invalid-verification-token-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { VerificationTokenExpiredError } from '@/use-cases/errors/verification-token-expired-error'
import { makeConfirmEmailChangeUseCase } from '@/use-cases/factories/make-confirm-email-change-use-case'

export async function confirmEmailChangeByLinkController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Public — the link carries the proof (the unguessable token), so no JWT.
	const querySchema = z.object({
		token: z.uuid(),
	})
	const { token } = querySchema.parse(request.query)

	try {
		const useCase = makeConfirmEmailChangeUseCase()
		const { userId } = await useCase.execute({ token })
		verifiedCache.set(userId, true)
		return reply.status(204).send()
	} catch (err) {
		if (err instanceof UserAlreadyExistsError) {
			return reply.status(409).send({ message: err.message })
		}
		if (err instanceof VerificationTokenExpiredError) {
			return reply.status(410).send({ message: err.message })
		}
		if (err instanceof InvalidVerificationTokenError) {
			return reply.status(400).send({ message: err.message })
		}
		if (err instanceof ResourceNotFoundError) {
			return reply.status(404).send({ message: err.message })
		}
		throw err
	}
}
