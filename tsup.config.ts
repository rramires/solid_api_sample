import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/server.ts'],
	format: ['esm'],
	outDir: 'build',
	splitting: false,
	sourcemap: true,
	clean: true,
})
