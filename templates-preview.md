# Templates Preview (MVP)

The scaffolder materializes the following files relative to the target directory:

- `.claude/orch.yaml` — orchestration config (policies, backends, outputs)
- `.claude/settings.json` — hooks wiring for Claude Code
- `.claude/mcp/runner.py` — multi-LLM child session runner (stub in MVP)
- `.claude/mcp/drivers/*.yaml` — driver definitions for claude/codex/gemini
- `.claude/hooks/*.py` — safety and logging hooks
- `.claude/agents/orchestrator-core.md` — orchestrator prompt
- `.claude/agents/<stack>-engineer.md` — engineer prompt
- `.claude/agents/<stack>-qa.md` — QA prompt
- `.pm/phase-<stack>-1.md` — starter phase plan

All templates use EJS placeholders and are rendered with `--stack`, `--backend-map`, and `--evidence-root`.

