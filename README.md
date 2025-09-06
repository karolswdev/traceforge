# create-orch-kit

Scaffold nested orchestration (Claude Code + optional Codex/Gemini backends) into any repo.

## Quick Start

```bash
npx create-orch-kit@latest init --stack golang \
  --backend-map orchestrator=claude,engineer=codex,qa=claude \
  --evidence-root ./evidence
```

This generates `.claude/*` agents, hooks, drivers, and a Python runner that spawns child sessions on the selected backends.

Additionally, it creates `docs/SRS.md` as a starter Software Requirements Specification to support traceability.

## Why

See `about.md` and `vision.md` for the full context: we emulate multi-level orchestration in Claude Code using hooks and a tiny runner, with per-role backend mapping (Claude/Codex/Gemini).

## Commands

- `init [target]` — scaffold the kit into a repository
- `add-stack [target] <name>` — add a stack using skeleton templates
- `doctor [target]` — validate orchestration files/drivers/hooks/agents
- `upgrade [target]` — reapply common templates and optional `--stack`

## Options

- `--stack <golang|dotnet>`
- `--backend-map orchestrator=claude,engineer=codex,qa=claude`
- `--evidence-root <path>` (default: `./evidence`)
- `--dry-run` — print the plan only
- `--force` — overwrite existing files

`upgrade` options:
- `--stack <name>` — also reapply the named stack templates
- `--backend-map`, `--evidence-root`, `--dry-run`, `--force`

## Requirements

- Node.js >= 18
- Optional: CLIs for configured backends (claude, codex, gemini) and their API keys

## Security

Hooks run with your environment privileges. Review changes in PRs and scope environment variables carefully.

## License

MIT

## Development

- Build: `npm run build`
- Try locally (once built): `node dist/index.js init --stack golang --dry-run`
- Add a stack: `node dist/index.js add-stack . dotnet`
- Doctor check: `node dist/index.js doctor .`
- Upgrade: `node dist/index.js upgrade . --stack golang --dry-run`
- Publish: `npm publish --access public`
