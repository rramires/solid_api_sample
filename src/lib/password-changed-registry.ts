import { PrismaPasswordChangedRegistry } from '@/repositories/prisma/prisma-password-changed-registry'

// Process-wide singleton, mirroring lib/token-denylist.ts. The middleware and
// the password-reset use-case share this single instance.
export const passwordChangedRegistry = new PrismaPasswordChangedRegistry()
