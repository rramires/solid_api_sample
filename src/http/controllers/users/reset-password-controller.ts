import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { passwordSchema } from '@/http/schemas/password-schema'
import { InvalidResetTokenError } from '@/use-cases/errors/invalid-reset-token-error'
import { ResetTokenExpiredError } from '@/use-cases/errors/reset-token-expired-error'
import { makeResetPasswordUseCase } from '@/use-cases/factories/make-reset-password-use-case'

export async function resetPasswordController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Two ways to reset: a link token (UUID) or an email + 6-digit OTP.
	const bodySchema = z.union([
		z.object({ token: z.uuid(), newPassword: passwordSchema }),
		z.object({
			email: z.email(),
			code: z.string().length(6),
			newPassword: passwordSchema,
		}),
	])
	const body = bodySchema.parse(request.body)

	try {
		const useCase = makeResetPasswordUseCase()
		await useCase.execute(body)
		return reply.status(204).send()
	} catch (err) {
		if (err instanceof ResetTokenExpiredError) {
			return reply.status(410).send({ message: err.message })
		}
		if (err instanceof InvalidResetTokenError) {
			// Generic 400 — never distinguish "bad token" from "no such email".
			return reply.status(400).send({ message: err.message })
		}
		throw err
	}
}
