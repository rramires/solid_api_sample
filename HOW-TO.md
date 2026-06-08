# Modernização do projeto: npm → pnpm, PostgreSQL → MySQL, Prisma 7, TypeScript 6, Vitest 4

> **Objetivo:** Guia passo a passo para reproduzir todas as atualizações feitas neste projeto a partir do estado original (PostgreSQL, npm, Prisma 5/6).  
> **Pré-requisito:** Node.js v20+, Docker rodando, projeto clonado e com `npm install` já executado.

---

## 1. Migrar de npm para pnpm

1 - Instale o pnpm globalmente caso não tenha:

```bash
npm i -g pnpm@latest
pnpm -v
```

2 - Remova o lockfile do npm e instale com pnpm:

```bash
rm package-lock.json
pnpm install
```

Isso vai gerar o `pnpm-lock.yaml`.

3 - Adicione o campo `packageManager` no `package.json`:

```json
"packageManager": "pnpm@11.5.2"
```

4 - Nos scripts do `package.json`, troque todas as referências de `npm run` / `npx` por `pnpm` / `pnpm exec`:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "compile": "pnpm exec tsc",
  "build": "tsup",
  "start": "node build/server.mjs",
  "lint": "eslint . --ext .ts",
  "lint:fix": "eslint . --ext .ts --fix",
  "check": "prettier --check \"src/**/*.ts\"",
  "format": "prettier --write \"src/**/*.ts\"",
  "compose:up": "docker compose up -d",
  "compose:stop": "docker compose stop",
  "compose:down": "docker compose down",
  "migrate": "pnpm exec prisma migrate dev",
  "showdb": "pnpm exec prisma studio --port 5555 --browser none",
  "test": "vitest run --project unit",
  "test:e2e": "vitest run --project e2e",
  "test:watch": "vitest --project unit",
  "test:e2e:watch": "vitest --project e2e",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage"
}
```

> **WSL2:** O Prisma Studio tenta abrir o browser via `cmd.exe` e crasha. O flag `--browser none` evita isso. Use sempre `--port 5555` para porta fixa.

5 - Commit:

```bash
git add .
git commit -m "chore: migrate from npm to pnpm"
git push
```

---

## 2. Limpar o .gitignore

O `.gitignore` gerado pelo GitHub é genérico e traz entradas de dezenas de frameworks que não existem neste projeto (Gatsby, VuePress, Yarn v2, Bower, etc.). Deixe apenas o necessário:

1 - Substitua o conteúdo completo do `.gitignore`:

```gitignore
# Build Folder
build

# Dependencies
node_modules

# Environment Variables (keep .env.example)
.env
.env.*.local

# TypeScript Incremental Compilation
*.tsbuildinfo

# Test Coverage
coverage
.nyc_output

# Logs
*.log
.pnpm-debug.log*

# OS
.DS_Store
```

2 - Commit:

```bash
git add .
git commit -m "chore: clean up .gitignore"
git push
```

---

## 3. Atualizar todos os pacotes para latest

1 - Atualize tudo de uma vez:

```bash
pnpm update --latest
```

2 - Verifique o resultado:

```bash
pnpm outdated
```

3 - Commit:

```bash
git add .
git commit -m "chore: update all dependencies to latest"
git push
```

---

## 4. Atualizar TypeScript 6

Com o TypeScript 6 e Node 24, o `tsconfig.json` precisa das seguintes mudanças:

1 - Abra o `tsconfig.json` e atualize:

```json
{
	"compilerOptions": {
		"target": "ES2024",
		"lib": ["ES2024"],
		"module": "ESNext",
		"moduleResolution": "bundler",
		"ignoreDeprecations": "6.0",
		"baseUrl": "./",
		"paths": {
			"@/*": ["./src/*"]
		},
		"outDir": "./dist",
		"rootDir": ".",
		"strict": true,
		"skipLibCheck": true,
		"types": ["node"]
	},
	"include": ["src/**/*.ts", "prisma/**/*.ts", "*.ts"],
	"exclude": ["node_modules", "dist", "build"]
}
```

> **Por que `moduleResolution: "bundler"` e não `"node16"`?**  
> Com `"type": "module"` no package.json, o modo `node16` exige extensão `.js` em todos os imports relativos — o que quebra toda a base de código existente. O modo `bundler` não faz essa exigência e é o correto para projetos com empacotadores (tsup) ou transpiladores (tsx).

> **`ignoreDeprecations: "6.0"`** suprime o aviso de depreciação do `baseUrl` no TS 6.

---

## 5. Atualizar ESLint (flat config)

O projeto já usa ESLint flat config (`eslint.config.mjs`). Com as versões mais novas há uma regra importante: **o plugin e suas regras devem estar no mesmo objeto de configuração**.

1 - Instale os pacotes necessários (caso não estejam):

```bash
pnpm add -D eslint eslint-config-prettier eslint-plugin-simple-import-sort typescript-eslint @eslint/js globals
```

2 - Substitua o conteúdo do `eslint.config.mjs`:

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

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
```

> **Atenção à ordem:** O `eslintConfigPrettier` desativa o `curly` como "special rule". Por isso a regra `curly` deve vir em um bloco separado **depois** do `eslintConfigPrettier`.

---

## 6. Criar/atualizar Prettier

1 - Instale os pacotes:

```bash
pnpm add -D prettier prettier-plugin-curly eslint-config-prettier
```

2 - Crie o arquivo `prettier.config.js` na raiz:

```js
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
```

3 - Crie o `.prettierignore`:

```
dist
build
node_modules
src/prisma-client
```

> O diretório `src/prisma-client` contém código **gerado** pelo Prisma. O Prettier falha ao tentar formatar esses arquivos — adicione-o sempre ao `.prettierignore`.

4 - Commit:

```bash
git add .
git commit -m "chore: update ESLint flat config, add Prettier with curly plugin"
git push
```

---

## 7. Adicionar @fastify/helmet

1 - Instale:

```bash
pnpm add @fastify/helmet
```

2 - Registre no `src/app.ts`, **antes** do JWT:

```ts
import fastifyHelmet from '@fastify/helmet'

// ...

// Security headers
app.register(fastifyHelmet)

// JWT
app.register(fastifyJwt, { ... })
```

---

## 8. Migrar Vitest 3 → 4 (workspace → projects)

O Vitest 4 removeu `test.workspace` e renomeou para `test.projects`.

1 - No `vite.config.mts`, substitua `workspace` por `projects`:

```ts
// ANTES (Vitest 3):
test: {
  workspace: [...]
}

// DEPOIS (Vitest 4):
test: {
  projects: [
    { extends: true, test: { name: 'unit', dir: 'src/use-cases' } },
    {
      extends: true,
      test: {
        name: 'e2e',
        dir: 'src/http/controllers',
        environment: './prisma/vitest-environment/prisma-test-environment.ts',
      },
    },
  ],
}
```

2 - Commit:

```bash
git add .
git commit -m "chore: add helmet, migrate Vitest 4 (workspace → projects)"
git push
```

---

## 9. Migrar Prisma 6 → 7

O Prisma 7 tem duas quebras de compatibilidade principais:

- A `url` da datasource **sai** do `schema.prisma` e vai para um `prisma.config.ts`
- O `PrismaClient` **exige** um driver adapter (não conecta mais diretamente)

### 8.1 Criar `prisma.config.ts` na raiz

```ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
	schema: 'prisma/schema.prisma',
	datasource: {
		url: env('DATABASE_URL'),
	},
})
```

### 8.2 Remover a `url` do `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  // url = env("DATABASE_URL")  ← REMOVER esta linha
}
```

### 8.3 Recriar o barrel `src/prisma-client/index.ts`

O Prisma 7 **não gera mais** o `index.ts` automaticamente. Crie manualmente após cada `prisma generate`:

```ts
export * from './client.js'
```

> ⚠️ **Este arquivo é apagado toda vez que `prisma generate` é executado.** Crie-o novamente após cada geração.

### 8.4 Atualizar `src/lib/prisma.ts` (com adapter)

Para PostgreSQL (que era o original):

```bash
pnpm add @prisma/adapter-pg pg
pnpm add -D @types/pg
```

```ts
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '@/env'
import { PrismaClient } from '../prisma-client'

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
})

export const prisma = new PrismaClient({
	adapter,
	log: env.NODE_ENV === 'development' ? ['query'] : [],
})
```

### 8.5 Corrigir tipos dos repositórios in-memory

O Prisma 7 tem tipagem mais estrita. No `in-memory-users-repository.ts`, o campo `role` se tornou obrigatório:

```ts
const user = {
	id: randomUUID(),
	name: data.name,
	email: data.email,
	password_hash: data.password_hash,
	role: data.role ?? 'MEMBER', // ← adicionar com fallback
	created_at: new Date(),
}
```

### 8.6 Regenerar o cliente

```bash
pnpm exec prisma generate
```

Após o generate, **recriar** o `src/prisma-client/index.ts` (passo 8.3).

4 - Commit:

```bash
git add .
git commit -m "chore: migrate to Prisma 7 (config file, driver adapter, barrel export)"
git push
```

---

## 10. Trocar PostgreSQL por MySQL

### 9.1 Atualizar o `docker-compose.yml`

Remover o serviço PostgreSQL e adicionar MySQL. O `name:` define o nome do grupo no VS Code Docker extension — independente do nome da pasta:

```yaml
name: solid_api_sample

services:
    solid_api_mysql:
        image: mysql:8
        ports:
            - 3306:3306
        environment:
            MYSQL_ROOT_PASSWORD: docker123
            MYSQL_DATABASE: gympass-db
```

> **Nota sobre o `name:`:** Use `root` como usuário MySQL para que o ambiente de testes tenha permissão de `CREATE DATABASE` / `DROP DATABASE`. O usuário criado via `MYSQL_USER` recebe acesso apenas ao `MYSQL_DATABASE` especificado, não permissão para criar novos bancos.

### 9.2 Trocar dependências

Remover adaptadores do PostgreSQL, adicionar o adapter do MariaDB/MySQL:

```bash
pnpm remove @prisma/adapter-pg pg @types/pg
pnpm add @prisma/adapter-mariadb
pnpm add -D mysql2
```

> **Por que `@prisma/adapter-mariadb` e não `@prisma/adapter-mysql`?**  
> O `@prisma/adapter-mysql` **não existe** no npm. O Prisma 7 usa `@prisma/adapter-mariadb` (que usa o driver `mariadb`) para MySQL e MariaDB self-hosted. O driver `mariadb` é compatível com MySQL 8.  
> O `mysql2` vai para `devDependencies` porque é usado apenas no ambiente de testes.

### 9.3 Atualizar `prisma/schema.prisma`

```prisma
datasource db {
  provider = "mysql"
}
```

### 9.4 Atualizar `prisma.config.ts`

Nenhuma alteração necessária — apenas o formato da `DATABASE_URL` muda.

### 9.5 Atualizar `.env` e `.env.example`

```bash
# .env
DATABASE_URL="mysql://root:docker123@localhost:3306/gympass-db"
```

```bash
# .env.example
DATABASE_URL=
```

### 9.6 Atualizar `src/lib/prisma.ts`

O `@prisma/adapter-mariadb` recebe configuração de conexão por objeto (não connection string). Parse a URL no momento de criação do adapter para que o ambiente de testes consiga apontar para bancos diferentes via `DATABASE_URL`:

```ts
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { env } from '@/env'
import { PrismaClient } from '../prisma-client'

function createAdapter() {
	const url = new URL(process.env.DATABASE_URL!)
	return new PrismaMariaDb({
		host: url.hostname,
		port: Number(url.port) || 3306,
		user: url.username,
		password: url.password,
		database: url.pathname.slice(1),
		connectionLimit: 5,
	})
}

export const prisma = new PrismaClient({
	adapter: createAdapter(),
	log: env.NODE_ENV === 'development' ? ['query'] : [],
})
```

> **Por que `createAdapter()` como função?**  
> O adapter lê `process.env.DATABASE_URL` no momento em que é chamado. Se fosse uma variável global, seria lida uma única vez no carregamento do módulo. Como função, cada contexto de módulo (test file) cria seu próprio adapter já com a URL atualizada pelo `vitest-environment`.

### 9.7 Recriar o `src/prisma-client/index.ts`

Após o `prisma generate` para MySQL, o arquivo é apagado novamente. Recrie:

```ts
export * from './client.js'
```

### 9.8 Atualizar `prisma/migrations/migration_lock.toml`

```toml
provider = "mysql"
```

### 9.9 Deletar migrations antigas e criar nova

As migrations do PostgreSQL são incompatíveis com MySQL:

```bash
rm -rf prisma/migrations/2025*  # remove todas as migrations antigas
```

Suba o container MySQL e aguarde inicializar (~30s):

```bash
pnpm compose:up
```

Aguarde o MySQL estar pronto:

```bash
docker exec solid_api_sample-solid_api_mysql-1 mysqladmin ping -u root -pdocker123 --silent
# Retorna "mysqld is alive" quando pronto
```

Crie a migration inicial para MySQL:

```bash
pnpm migrate --name init
# ou: pnpm exec prisma migrate dev --name init
```

### 9.10 Recriar o `src/prisma-client/index.ts`

O `migrate dev` executa `prisma generate` internamente e apaga o arquivo novamente. Recrie mais uma vez:

```ts
export * from './client.js'
```

---

## 11. Atualizar o ambiente de testes E2E para MySQL

O ambiente de testes do PostgreSQL usava `?schema=UUID` na URL para isolamento. O MySQL **não tem schemas** — o isolamento é feito criando um banco separado por test file.

Reescreva `prisma/vitest-environment/prisma-test-environment.ts`:

```ts
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

import mysql from 'mysql2/promise'
import type { Environment } from 'vitest/environments' with { 'resolution-mode': 'import' }

function generateDatabaseUrl(dbName: string) {
	if (!process.env.DATABASE_URL) {
		throw new Error('Please provide DATABASE_URL env variable')
	}
	// Troca o nome do banco no path da URL
	const url = new URL(process.env.DATABASE_URL)
	url.pathname = `/${dbName}`
	return url.toString()
}

/**
 * Isolamento de testes para MySQL:
 * - Cria um banco novo por test file via mysql2 (sem importar o prisma)
 * - Aponta DATABASE_URL para o novo banco
 * - Executa as migrations
 * - Derruba o banco no teardown
 *
 * IMPORTANTE: NÃO importar `prisma` de @/lib/prisma neste arquivo.
 * Se o módulo for carregado aqui, ele fica em cache com o DATABASE_URL
 * original e os test files não conseguem apontar para o banco de teste.
 */
export default <Environment>{
	name: 'prisma',
	transformMode: 'ssr',
	async setup() {
		if (!process.env.DATABASE_URL) {
			throw new Error('Please provide DATABASE_URL env variable')
		}

		// Nome único sem hífens (identificador MySQL válido com backticks)
		const dbName = `test_${randomUUID().replace(/-/g, '_')}`

		// Parse das credenciais da DATABASE_URL
		const url = new URL(process.env.DATABASE_URL)
		const connConfig = {
			host: url.hostname,
			port: Number(url.port) || 3306,
			user: url.username,
			password: url.password,
		}

		// Cria o banco de teste via mysql2 direto (sem passar pelo Prisma)
		const conn = await mysql.createConnection(connConfig)
		await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
		await conn.end()

		// Aponta a variável de ambiente para o novo banco e executa migrations
		process.env.DATABASE_URL = generateDatabaseUrl(dbName)
		execSync('pnpm exec prisma migrate deploy')

		return {
			async teardown() {
				const dropConn = await mysql.createConnection(connConfig)
				await dropConn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``)
				await dropConn.end()
			},
		}
	},
}
```

> **Por que não importar `prisma` de `@/lib/prisma` neste arquivo?**  
> O Vitest carrega o módulo do environment antes de executar o `setup()`. Se `@/lib/prisma` for importado aqui, ele vai para o cache de módulos com o `DATABASE_URL` original. Quando os test files importam `@/lib/prisma` depois do `setup()` (que já trocou o `DATABASE_URL`), recebem a instância cacheada — conectada ao banco errado. Usando `mysql2` diretamente para criar/dropar bancos, o environment não "contamina" o cache de módulos.

---

## 12. Atualizar GitHub Actions

### `.github/workflows/run-unit-tests.yml`

```yaml
name: Unit Tests

on: [push]

jobs:
    run-unit-tests:
        name: Execute Unit Tests
        runs-on: ubuntu-latest

        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 24
            - uses: pnpm/action-setup@v4
              with:
                  version: latest
            - run: pnpm install --frozen-lockfile
            - run: pnpm test
```

### `.github/workflows/run-e2e-tests.yml`

```yaml
name: E2E Tests

on: [pull_request]

jobs:
    run-e2e-tests:
        name: Execute E2E Tests
        runs-on: ubuntu-latest

        services:
            mysql:
                image: mysql:8
                ports:
                    - 3306:3306
                env:
                    MYSQL_ROOT_PASSWORD: docker123
                    MYSQL_DATABASE: gympass-db
                options: >-
                    --health-cmd="mysqladmin ping -h localhost"
                    --health-interval=10s
                    --health-timeout=5s
                    --health-retries=5

        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 24
            - uses: pnpm/action-setup@v4
              with:
                  version: latest
            - run: pnpm install --frozen-lockfile
            - run: pnpm test:e2e

              env:
                  NODE_ENV: test
                  PORT: 3333
                  JWT_SECRET: acceptsMin20characters
                  DATABASE_URL: 'mysql://root:docker123@127.0.0.1:3306/gympass-db'
```

5 - Commit final:

```bash
git add .
git commit -m "feat: switch from PostgreSQL to MySQL (Prisma 7, mariadb adapter, test isolation)"
git push
```

---

## 13. Verificação final

### Compilação

```bash
pnpm compile
# Deve retornar sem erros
```

### Lint

```bash
pnpm lint
# Deve retornar sem erros
```

### Testes unitários

```bash
pnpm test
# Deve retornar: Test Files 10 passed (10) / Tests 22 passed (22)
```

### Servidor + rotas

Em um terminal, suba o servidor:

```bash
pnpm dev
```

Em outro terminal, execute o bloco abaixo completo. Ele testa todas as rotas em sequência, captura o token automaticamente e valida cada resposta:

```bash
BASE="http://127.0.0.1:3333"

# 1. Rota de healthcheck
echo "=== 1. GET /hello ===" && \
curl -s "$BASE/hello" && echo

# 2. Criar usuário comum
echo -e "\n=== 2. POST /users (fulano) ===" && \
curl -s -X POST "$BASE/users" -H "Content-Type: application/json" \
  -d '{"name":"Fulano","email":"fulano@email.com","password":"abc123"}' | python3 -m json.tool

# 3. Criar usuário que será promovido a ADMIN
echo -e "\n=== 3. POST /users (admin) ===" && \
curl -s -X POST "$BASE/users" -H "Content-Type: application/json" \
  -d '{"name":"Administrator","email":"admin@email.com","password":"abc123"}' | python3 -m json.tool

# 4. Login (captura token e salva cookie de refresh)
echo -e "\n=== 4. POST /sessions (fulano) ===" && \
TOKEN=$(curl -s -c /tmp/cookies.txt -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d '{"email":"fulano@email.com","password":"abc123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Token: ${TOKEN:0:40}..."

# 5. Perfil do usuário autenticado
echo -e "\n=== 5. GET /me ===" && \
curl -s "$BASE/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 6. Renovar token via refresh cookie
echo -e "\n=== 6. PATCH /token/refresh ===" && \
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X PATCH "$BASE/token/refresh" | python3 -m json.tool

# 7. Criar academia com MEMBER → deve retornar 401 Unauthorized
echo -e "\n=== 7. POST /gyms (esperado: 401 - role MEMBER) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Gym","description":"Test","phone":"9999-8888","latitude":"-25.4677004","longitude":"-49.304584"}' | \
  python3 -m json.tool
```

O passo 7 deve retornar `401 Unauthorized`. Para criar academias é preciso ter `role: ADMIN`.

Promova o usuário admin diretamente no banco (não há endpoint para isso):

```bash
docker exec solid_api_sample-solid_api_mysql-1 \
  mysql -u root -pdocker123 gympass-db \
  -e "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@email.com';
      SELECT id, name, email, role FROM users;"
```

Agora faça login com o admin e crie a academia:

```bash
BASE="http://127.0.0.1:3333"

# 8. Login como ADMIN (gera novo token com role=ADMIN embutido)
echo "=== 8. POST /sessions (admin) ===" && \
ADMIN_TOKEN=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"abc123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "Admin token: ${ADMIN_TOKEN:0:40}..."

# 9. Criar academia com ADMIN → deve retornar 201 Created
echo -e "\n=== 9. POST /gyms (ADMIN - deve criar) ===" && \
curl -s -X POST "$BASE/gyms" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Academia SOLID","description":"Treino funcional","phone":"9999-8888","latitude":"-25.4677004","longitude":"-49.304584"}' | \
  python3 -m json.tool
```

O passo 9 deve retornar `201 Created` com os dados da academia criada.

> **Por que o novo login é obrigatório?** O `role` é embutido no payload do JWT no momento do login. Promover via SQL não invalida o token existente — o token antigo continua com `role: MEMBER`. É preciso gerar um novo token com `POST /sessions` para que o `role: ADMIN` seja incluído.

---

## Armadilhas e notas importantes

| Situação                                                               | O que fazer                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm migrate` ou `prisma generate` apaga `src/prisma-client/index.ts` | Recriar manualmente com `export * from './client.js'`                                            |
| Container MySQL sem port binding após `compose:up` com falha           | Fazer `docker compose down` + `docker compose up -d` (não basta remover o container manualmente) |
| MySQL demora ~30s para inicializar                                     | Aguardar `mysqladmin ping` retornar `mysqld is alive` antes de rodar migrations                  |
| `@prisma/adapter-mysql` não existe                                     | Usar `@prisma/adapter-mariadb` (driver `mariadb`, compatível com MySQL 8)                        |
| Prisma Studio crasha no WSL2                                           | Usar flag `--browser none`. Script: `prisma studio --port 5555 --browser none`                   |
| Rotas com `role: ADMIN` retornam 401 após promover no banco            | O `role` está no JWT — precisa fazer novo login para gerar token com `role: ADMIN`               |
