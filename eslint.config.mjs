import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
	{ ignores: ['dist/*', 'build/*', 'src/prisma-client/*', 'node_modules/*'] },
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		plugins: { js },
		extends: ['js/recommended'],
	},
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		languageOptions: { globals: globals.node },
	},
	tseslint.configs.recommended,
	// simple-import-sort DEVE estar no mesmo objeto que suas regras (ESLint 10)
	{
		plugins: { 'simple-import-sort': simpleImportSort },
		rules: {
			'prefer-const': 'warn',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'simple-import-sort/imports': 'error',
		},
	},
	eslintConfigPrettier,
	// curly DEPOIS do eslintConfigPrettier, que o desativa como "special rule"
	{ rules: { curly: ['error', 'all'] } },
])
