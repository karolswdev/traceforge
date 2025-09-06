# Contributing to Traceforge

Thanks for your interest in contributing! Traceforge provides a robust, npx-ready scaffolder for multi-level orchestration and requirements/phase generation.

## Getting Started

- Node.js >= 18
- Clone the repo and install deps: `npm i`
- Build: `npm run build`
- Dev-run: `npm run dev`

## Commit Style

Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`) and commit frequently. Each significant addition warrants a smart commit.

## Development Scope

- Keep MVP behavior deterministic and safe (idempotent writes, `--dry-run`, `--force`)
- Template changes should remain EJS-only and avoid runtime logic
- Avoid destructive actions by default; surface a clear plan before writing

## Tests

- Add unit tests under `test/` using Vitest (if/when enabled)
- Prefer fast, deterministic tests without network calls

## Adding Stacks

- Add templates under `src/stacks/<name>/templates/**`
- Provide engineer/qa agent files and at least one starter `.pm` phase skeleton

## Code of Conduct

Participating in this project means agreeing to our Code of Conduct.
