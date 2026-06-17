import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '@/env'
import { passwordSchema } from '@/http/schemas/password-schema'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { makeRegisterUseCase } from '@/use-cases/factories/make-register-use-case'

export async function registerController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const bodySchema = z.object({
		// 3-30 chars, letters/numbers/underscore only, stored lowercase.
		username: z
			.string()
			.min(env.MIN_TEXT_LENGTH)
			.max(30)
			.regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, underscore only')
			.transform((s) => s.toLowerCase()),
		email: z.email(),
		// Length + complexity policy (env-driven); see password-schema.ts.
		password: passwordSchema,
	})
	const { username, email, password } = bodySchema.parse(request.body)

	try {
		const registerUseCase = makeRegisterUseCase()

		const { user } = await registerUseCase.execute({
			username,
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
