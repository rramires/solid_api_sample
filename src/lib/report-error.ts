import { app } from '@/app'

// Single seam for error reporting. Today it just logs through pino; swap the
// body for Sentry/Datadog/etc. later without touching any call site.
export function reportError(error: unknown) {
	app.log.error(error)
}
