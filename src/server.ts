// Pre-initialize the login-attempt tracker so the cleanup interval starts on
// server boot rather than on the first authenticate request.
import './lib/login-attempt-tracker'

import { app } from './app'
import { env } from './env'
import { passwordChangedRegistry } from './lib/password-changed-registry'
import { tokenDenylist } from './lib/token-denylist'

async function bootstrap() {
	try {
		// Warm the revocation denylist and password-change registry from the
		// database before accepting traffic.
		await tokenDenylist.load()
		await passwordChangedRegistry.load()

		const address = await app.listen({
			// '0.0.0.0' ensures access across all network interfaces
			host: '0.0.0.0',
			port: env.PORT,
		})
		app.log.info(`Server is running at ${address}`)
	} catch (err) {
		app.log.error(err)
		process.exit(1)
	}
}

// Drain in-flight requests and release resources (the onClose hook disconnects
// Prisma) before exiting. A timeout guard forces exit if shutdown stalls.
async function shutdown(signal: string) {
	app.log.info(`Received ${signal}, shutting down gracefully...`)

	const forceExit = setTimeout(() => {
		app.log.error('Could not close connections in time, forcing shutdown.')
		process.exit(1)
	}, 10_000)
	forceExit.unref()

	try {
		await app.close()
		process.exit(0)
	} catch (err) {
		app.log.error(err)
		process.exit(1)
	}
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

bootstrap()
