import { FastifyInstance } from 'fastify'
import request from 'supertest'

import { prisma } from '@/lib/prisma'
import { Role } from '@/prisma-client/enums'

export default async function createAndAuthUser(
	app: FastifyInstance,
	isAdmin = false,
) {
	const newUser = {
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'Abc@1234',
	}
	// create user
	const response = await request(app.server).post('/users').send(newUser)
	const { user } = response.body

	// FIXME: solve in a better way - update to admin, if necessary
	if (isAdmin) {
		await await prisma.user.update({
			where: {
				id: user.id,
			},
			data: {
				role: Role.ADMIN,
			},
		})
	}

	// authenticate
	const authResponse = await request(app.server).post('/auth/login').send({
		identifier: newUser.email,
		password: newUser.password,
	})
	const { token } = authResponse.body

	return {
		token,
		user,
	}
}
