import { FastifyInstance } from 'fastify'

// Stricter per-route limiter for sensitive auth endpoints (login, registration).
// Returns an onRequest hook produced by @fastify/rate-limit.
export const strictAuthLimit = (
	app: FastifyInstance,
	max = 5,
	timeWindow: string | number = '1 minute',
) => app.rateLimit({ max, timeWindow })
