// TO REPLACE WITH REDIS: swap InMemoryLoginAttemptTracker for a Redis implementation
// that implements ILoginAttemptTracker with the same async contract.
import { env } from '@/env'
import { InMemoryLoginAttemptTracker } from '@/repositories/in-memory/in-memory-login-attempt-tracker'

import { ILoginAttemptTracker } from '../repositories/i-login-attempt-tracker'

export const loginAttemptTracker: ILoginAttemptTracker =
	new InMemoryLoginAttemptTracker(
		env.LOGIN_MAX_ATTEMPTS,
		env.LOGIN_LOCKOUT_MINUTES,
	)
