# Traceforge

Traceforge scaffolds production-grade, multi-agent orchestration into any repository and adds AI-assisted SRS and phase planning. It’s built for agentic development with Claude Code, and optionally Codex/Gemini backends per role.

## Quick Start

```bash
npx traceforge@latest init --stack golang \
  --backend-map orchestrator=claude,engineer=codex,qa=claude \
  --evidence-root ./evidence
```

This generates `.claude/*` agents, hooks, drivers, and a Python runner that spawns child sessions on the selected backends.

Additionally, it creates `docs/SRS.md` as a starter Software Requirements Specification to support traceability.

## Why

See `about.md` and `vision.md` for the full context: Traceforge emulates multi-level orchestration in Claude Code using hooks and a tiny runner, with per-role backend mapping (Claude/Codex/Gemini).

## Commands

- `init [target]` — scaffold the kit into a repository (.claude/*, .pm/*, docs/SRS.md)
- `add-stack [target] <name>` — add a stack using skeleton templates
- `doctor [target]` — validate orchestration files/drivers/hooks/agents
- `upgrade [target]` — reapply common templates and optional `--stack`
- `gen-srs [target]` — generate or refine an SRS (interactive and/or AI-assisted)
- `gen-phase [target] --stack <name>` — generate a phase file (optionally AI-assisted)

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
- Try locally: `node dist/index.js init --stack golang --dry-run`
- Add a stack: `node dist/index.js add-stack . dotnet`
- Doctor check: `node dist/index.js doctor .`
- Upgrade: `node dist/index.js upgrade . --stack golang --dry-run`
- Generate SRS: `node dist/index.js gen-srs . --project traceforge --interactive`
SRS generation options:
- `--project <name>` — required unless using `--interactive`
- `--interactive` — prompt for fields
- `--ai` — use OpenAI-compatible endpoint (with `--model`, `--base-url`, `--api-key` or env `OPENAI_API_KEY`)

Phase generation options:
- `--stack <name>` — stack name (e.g., golang)
- `--id <PHASE-ID>` — override phase ID
- `--title <string>` — title of the phase
- `--ai` — request AI to propose story tasks
- Generate Phase: `node dist/index.js gen-phase . --stack golang --ai`
- Publish: `npm publish --access public`

## Why Traceforge

- Orchestrated sub-orchestration: overcome single-level delegation with hooks and a runner.
- Evidence-driven: deterministic outputs and evidence paths for audits and CI.
- Multi-LLM by role: map orchestrator/engineer/qa to best-fit backends.
- Safe and idempotent: clear plan, dry-run, and non-destructive by default.

## Architecture

- `.claude/hooks/*`: guardrails and state injection
- `.claude/mcp/runner.py`: multi-LLM child-session runner (swappable backends)
- `.claude/agents/*`: orchestrator + stack engineer/qa prompts
- `.pm/*`: phase/story plan skeletons
- `docs/SRS.md`: live SRS (interactive and AI-assisted generation supported)

## Roadmap (Highlights)

- Doctor: deeper environment and CLI verification
- Upgrade: 3-way merge of local changes with template updates
- Stack plugins: discover `traceforge-stack-*` via npm
