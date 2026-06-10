import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		coverage: {
			// Generated Prisma client is not our code to test.
			exclude: ['src/prisma-client/**'],
			// Floor set below current (~88% lines / ~92% funcs) to catch
			// regressions without being brittle. Raise as coverage grows.
			thresholds: {
				lines: 80,
				functions: 80,
			},
		},
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: [
						'src/use-cases/**/*.spec.ts',
						'src/utils/**/*.spec.ts',
						'src/repositories/**/*.spec.ts',
						'src/lib/**/*.spec.ts',
					],
				},
			},
			{
				extends: true,
				test: {
					name: 'e2e',
					// Controller e2e specs, plus prisma integration specs
					// (*.int-spec.ts) that need the isolated test database.
					include: [
						'src/http/controllers/**/*.spec.ts',
						'src/repositories/prisma/**/*.int-spec.ts',
					],
					environment:
						'./prisma/vitest-environment/prisma-test-environment.ts',
				},
			},
		],
	},
})
