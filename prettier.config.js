/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
	plugins: ['prettier-plugin-curly'],
	printWidth: 80,
	endOfLine: 'lf',
	singleQuote: true,
	quoteProps: 'as-needed',
	semi: false,
	useTabs: true,
	tabWidth: 4,
	arrowParens: 'always',
}

export default config
