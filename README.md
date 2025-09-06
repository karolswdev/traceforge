# Traceforge ✨

[![CI](https://github.com/karolswdev/traceforge/actions/workflows/ci.yml/badge.svg)](https://github.com/karolswdev/traceforge/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/traceforge)](https://www.npmjs.com/package/traceforge)
[![npm downloads](https://img.shields.io/npm/dm/traceforge)](https://www.npmjs.com/package/traceforge)
[![codecov](https://codecov.io/gh/karolswdev/traceforge/branch/master/graph/badge.svg)](https://codecov.io/gh/karolswdev/traceforge)
[![license](https://img.shields.io/github/license/karolswdev/traceforge)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](#requirements)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](#)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0-ffa500.svg)](https://www.conventionalcommits.org)
[![Stars](https://img.shields.io/github/stars/karolswdev/traceforge?style=social)](https://github.com/karolswdev/traceforge)

Traceforge scaffolds production‑grade, multi‑agent orchestration into any repository and adds AI‑assisted SRS and phase planning. Built for agentic development with Claude Code, plus optional Codex/Gemini per role.

🚀 Value Proposition (Drop‑in for Claude Code)
- 🧠 Real multi‑level orchestration via a tiny runner + hooks (overcomes single‑level subagent limits)
- 🧪 Guardrailed engineer ⇄ QA loops with policy gates, retries, and traceable evidence
- 🧩 Plug‑in backends per role (Claude/Codex/Gemini) — vendor‑agnostic by design
- 🗂️ Deterministic outputs: `.claude/*`, `.pm/*`, and `docs/SRS.md` for end‑to‑end traceability

## Quick Start

```bash
npx traceforge@latest init --stack golang \
  --backend-map orchestrator=claude,engineer=codex,qa=claude \
  --evidence-root ./evidence
```

This generates `.claude/*` agents, hooks, drivers, and a Python runner that spawns child sessions on the selected backends.

Additionally, it creates `docs/SRS.md` as a starter Software Requirements Specification to support traceability.

## Why 💡

Traceforge emulates multi‑level orchestration inside Claude Code using hooks and a tiny runner, then enforces a methodology with engineer/QA cycles, gates, and evidence. Per‑role backend mapping (Claude/Codex/Gemini) lets you pick the best tool for each role without vendor lock‑in.

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

## Publishing

- npmjs: publish unscoped `traceforge` (see `.github/workflows/release.yml`).
- GitHub Packages: requires a scope. CI can publish as `@karolswdev/traceforge` — see `PUBLISHING.md`.

## How It Works 🛠️

1) 🧭 Orchestrator reads the phase file and policies, builds a DAG of stories.
2) 🧑‍💻 Engineer implements each story atomically (code → tests → traceability → commit).
3) 🔍 QA verifies tests, coverage, linters, vuln/secret scans, and traceability; can minimally repair if policy allows.
4) ♻️ Remediation loop runs (engineer ⇄ QA) within retry limits until GREEN or policy STOP.
5) 🚦 Phase Gate: run regression, PR/merge, header flip; orchestrator writes log and summary.
6) 🧾 Evidence: artifacts under `evidence/`, with orchestrator `log.md` and `summary.json`.

Under the hood, hooks block nested Task calls and redirect work to the runner/MCP, which spawns child sessions on the configured backends and returns structured results. You get deterministic behavior and clean audit trails.

## Star History ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=karolswdev/traceforge&type=Date)](https://star-history.com/#karolswdev/traceforge&Date)

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
