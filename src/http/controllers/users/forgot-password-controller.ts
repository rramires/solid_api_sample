import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { makeForgotPasswordUseCase } from '@/use-cases/factories/make-forgot-password-use-case'

export async function forgotPasswordController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const bodySchema = z.object({
		email: z.email(),
	})
	const { email } = bodySchema.parse(request.body)

	const useCase = makeForgotPasswordUseCase()
	await useCase.execute({ email })

	// Always 202 with the same body — never reveal whether the email exists.
	return reply.status(202).send({
		message: 'If the email exists, reset instructions were sent.',
	})
}
