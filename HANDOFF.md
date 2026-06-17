# HANDOFF — solid_api_sample

_Atualizado: 2026-06-16 @ 29a9573 (branch master)_

## Resume prompt (cole em qualquer sessão / modelo)

> Leia este HANDOFF.md + CLAUDE.md e continue a partir de "Estado atual".
> Honre as regras do CLAUDE.md. Confirme antes de qualquer ação irreversível. Nunca dê push.

## Estado atual

- Branch / commit: `master` @ `29a9573` (2026-06-16); árvore limpa.
- origin: ref local de `origin/master` = `29a9573`. Push é do usuário — confirmar se o
  commit do `AGENTS.md` já subiu.
- Em andamento: **nada**.
- Próximo passo: aguardando próxima tarefa.
- Backlog curto: —
- Threads abertas:
  - `dist/skills-cheatsheet.md` = cheatsheet descartável (gitignored). Usuário copia p/ o
    drive na nuvem e apaga.
  - Trabalho desta sessão **fora deste repo** (`~/.claude/`, não versionado aqui): skill
    `checkpoint` revisada + skill `house-rules` nova (`SKILL.md` + `AGREEMENT.md`) +
    registro em `~/.claude/CLAUDE.md`.

## Como trabalhamos (regras)

Doutrina completa: ver **`CLAUDE.md`** (governa branch / commit / merge / push).
Guardrails que NÃO podem falhar: **nunca push** (é do usuário) · **nunca commit sem
aprovação** · **gate verde** (`pnpm lint && pnpm compile && pnpm test`) antes de cada commit.

## Memória profunda

Harness memory (só Claude / mesma máquina):
`~/.claude/projects/-home-user--Dev-samples-solid-api-sample/memory/`
Cobre: smoke de rotas (rate-limit / tsx-watch), gate de format pré-commit, reset/migrate
Prisma, idioma pt-BR, revisar docs + rotas no fim de cada tarefa.
