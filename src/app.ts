import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import fastifyRateLimit from '@fastify/rate-limit'
import fastify from 'fastify'
import { ZodError } from 'zod'

import { env } from './env'
import { checkInsRoutes } from './http/controllers/check-ins/routes'
import { gymsRoutes } from './http/controllers/gyms/routes'
import { usersRoutes } from './http/controllers/users/routes'
import { reportError } from './lib/report-error'

export const app = fastify({
	bodyLimit: env.BODY_LIMIT,
	// Structured JSON logs in production; human-readable in development; silent
	// during tests to avoid worker-thread noise and open handles.
	logger:
		env.NODE_ENV === 'test'
			? false
			: env.NODE_ENV === 'production'
				? { level: env.LOG_LEVEL }
				: { transport: { target: 'pino-pretty' } },
})
// Security headers. Helmet defaults are fine for a JSON API; a custom CSP only
// matters if this service starts serving HTML.
app.register(fastifyHelmet)
// CORS. credentials:true is required to send the refresh-token cookie.
// Dev allows any origin; prod restricts to the configured allow-list.
app.register(fastifyCors, {
	credentials: true,
	origin:
		env.NODE_ENV === 'production'
			? (env.CORS_ORIGIN?.split(',') ?? false)
			: true,
})
// Global rate limit per IP. For multi-instance, swap the store for Redis later.
app.register(fastifyRateLimit, {
	max: 100,
	timeWindow: '1 minute',
})
// JWT
app.register(fastifyJwt, {
	secret: env.JWT_SECRET,
	cookie: {
		cookieName: 'refreshToken',
		signed: false,
	},
	sign: {
		expiresIn: '4h',
	},
})
app.register(fastifyCookie)
// Routes
app.register(usersRoutes)
app.register(gymsRoutes)
app.register(checkInsRoutes)
// Errors
app.setErrorHandler((error, request, reply) => {
	if (error instanceof ZodError) {
		return reply.status(400).send({
			message: 'Validation error.',
			// In production expose only path + message; full format() leaks input shape
			issues:
				env.NODE_ENV === 'production'
					? error.issues.map((issue) => ({
							path: issue.path,
							message: issue.message,
						}))
					: error.format(),
		})
	}
	if (env.NODE_ENV === 'production') {
		// Production: route through the reporting seam (Sentry/Datadog later).
		reportError(error)
	} else {
		request.log.error(error)
	}
	// Other errors
	return reply.status(500).send({ message: 'Internal server error.' })
})
