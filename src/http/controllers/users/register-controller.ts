import { FastifyReply,FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '@/env'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { makeRegisterUseCase } from '@/use-cases/factories/make-register-use-case'

export async function registerController(request: FastifyRequest, reply: FastifyReply) {
	const bodySchema = z.object({
		name: z.string(),
		email: z.email(),
		// Minimum length is configurable; 72 is the bcrypt input ceiling (anti-DoS)
		password: z.string().min(env.PASSWORD_MIN_LENGTH).max(72),
	})
	const { name, email, password } = bodySchema.parse(request.body)

	try {
		const registerUseCase = makeRegisterUseCase()

		const { user } = await registerUseCase.execute({
			name,
			email,
			password,
		})

		return reply.status(201).send({
			user,
		})
	} catch (err) {
		if (err instanceof UserAlreadyExistsError) {
			// 409 Conflict
			return reply.status(409).send({ message: err.message })
		}
		// Other unspecified errors (Fastify capture this)
		throw err
	}
}
