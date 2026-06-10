import { createHash } from 'node:crypto'

// Hex SHA-256. Password-reset tokens are stored hashed, so a database leak does
// not hand out usable reset links/codes.
export function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex')
}
