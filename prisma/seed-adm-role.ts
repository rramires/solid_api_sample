import 'dotenv/config'

import { hash } from 'bcryptjs'

import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { Role } from '@/prisma-client/enums'

// Idempotent ADMIN seed: creates the admin user from environment-provided
// credentials if it does not exist yet. Safe to run repeatedly — an existing
// admin is left untouched (update: {}), so its password is never reset.
async function seedAdminRole() {
	const password_hash = await hash(env.ADMIN_PASSWORD, 12)

	const admin = await prisma.user.upsert({
		where: { email: env.ADMIN_EMAIL },
		update: {},
		create: {
			username: env.ADMIN_USERNAME,
			email: env.ADMIN_EMAIL,
			password_hash,
			role: Role.ADMIN,
			// Admin can't verify via an email it may not control; seed as verified
			// so REQUIRE_EMAIL_VERIFICATION=true never locks the admin out.
			is_verified: true,
		},
	})

	console.log(`Admin user ready: ${admin.email}`)
}

seedAdminRole()
	.then(() => prisma.$disconnect())
	.catch(async (error) => {
		console.error(error)
		await prisma.$disconnect()
		process.exit(1)
	})
