import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { verifiedCache } from '@/lib/verified-cache'
import { InvalidVerificationTokenError } from '@/use-cases/errors/invalid-verification-token-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { VerificationTokenExpiredError } from '@/use-cases/errors/verification-token-expired-error'
import { makeConfirmEmailChangeUseCase } from '@/use-cases/factories/make-confirm-email-change-use-case'

export async function confirmEmailChangeByOtpController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const bodySchema = z.object({
		code: z.string().length(6),
	})
	const { code } = bodySchema.parse(request.body)

	try {
		const useCase = makeConfirmEmailChangeUseCase()
		const { userId } = await useCase.execute({
			userId: request.user.sub,
			code,
		})
		// Confirming proves the new address → account is verified again.
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
