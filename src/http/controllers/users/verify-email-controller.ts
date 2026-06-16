import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { verifiedCache } from '@/lib/verified-cache'
import { AlreadyVerifiedError } from '@/use-cases/errors/already-verified-error'
import { InvalidVerificationTokenError } from '@/use-cases/errors/invalid-verification-token-error'
import { VerificationTokenExpiredError } from '@/use-cases/errors/verification-token-expired-error'
import { makeVerifyEmailUseCase } from '@/use-cases/factories/make-verify-email-use-case'

export async function verifyEmailByLinkController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const querySchema = z.object({
		token: z.string().uuid(),
	})
	const { token } = querySchema.parse(request.query)

	try {
		const useCase = makeVerifyEmailUseCase()
		const { userId } = await useCase.execute({ token })
		// Refresh the read-through cache so the middleware unblocks immediately.
		verifiedCache.set(userId, true)
		return reply.status(204).send()
	} catch (err) {
		if (err instanceof AlreadyVerifiedError) {
			return reply.status(409).send({ message: err.message })
		}
		if (err instanceof VerificationTokenExpiredError) {
			return reply.status(410).send({ message: err.message })
		}
		if (err instanceof InvalidVerificationTokenError) {
			return reply.status(400).send({ message: err.message })
		}
		throw err
	}
}

export async function verifyEmailByOtpController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const bodySchema = z.object({
		code: z.string().length(6),
	})
	const { code } = bodySchema.parse(request.body)

	try {
		const useCase = makeVerifyEmailUseCase()
		const { userId } = await useCase.execute({
			userId: request.user.sub,
			code,
		})
		// Refresh the read-through cache so the middleware unblocks immediately.
		verifiedCache.set(userId, true)
		return reply.status(204).send()
	} catch (err) {
		if (err instanceof AlreadyVerifiedError) {
			return reply.status(409).send({ message: err.message })
		}
		if (err instanceof VerificationTokenExpiredError) {
			return reply.status(410).send({ message: err.message })
		}
		if (err instanceof InvalidVerificationTokenError) {
			return reply.status(400).send({ message: err.message })
		}
		throw err
	}
}
