import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { InvalidCredentialsError } from '@/use-cases/errors/invalid-credentials-error'
import { makeAuthenticateUseCase } from '@/use-cases/factories/make-authenticate-use-case'

export async function authenticateController(request: FastifyRequest, reply: FastifyReply) {
	const bodySchema = z.object({
		email: z.string().email(),
		password: z.string().min(6),
	})
	const { email, password } = bodySchema.parse(request.body)

	try {
		const authenticateUseCase = makeAuthenticateUseCase()
		const { user } = await authenticateUseCase.execute({
			email,
			password,
		})
		// JWT
		const token = await reply.jwtSign(
			{
				role: user.role,
			},
			{
				sign: {
					sub: user.id,
				},
			},
		)
		//
		const refreshToken = await reply.jwtSign(
			{
				role: user.role,
			},
			{
				sign: {
					sub: user.id,
					expiresIn: '7d',
				},
			},
		)
		return reply
			.status(200)
			.setCookie('refreshToken', refreshToken, {
				path: '/',
				secure: true,
				sameSite: true,
				httpOnly: true,
			})
			.send({
				token,
			})
		//
	} catch (err) {
		if (err instanceof InvalidCredentialsError) {
			// 401 Unauthorized
			return reply.status(401).send({ message: err.message })
		}
		// Other unspecified errors (Fastify capture this)
		throw err
	}
}
