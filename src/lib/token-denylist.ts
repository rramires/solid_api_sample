import { PrismaTokenDenylist } from '@/repositories/prisma/prisma-token-denylist'

// Process-wide singleton, mirroring the lib/prisma.ts pattern. The middleware
// and the logout controller share this single instance.
export const tokenDenylist = new PrismaTokenDenylist()
