# Orchestrated Sub‑Orchestration — What we’re working around, how we fix it, and what gets scaffolded

> **TL;DR**: Claude Code only exposes **one‑level** delegation (BASE → Subagent). This kit packages a safe, deterministic workaround that **emulates multi‑level orchestration** by routing sub‑tasks through a tiny runner (or MCP tool) and enforcing the flow with **hooks**. You get a phase‑by‑phase methodology (engineer ⇄ QA loops, gates, evidence, traceability, and commits) and a plug‑in model for **multi‑LLM backends** (Claude/Codex/Gemini) per role.

---

## 1) The platform limitation

* **Native constraint**: Claude Code’s subagents are flat: the main thread can delegate to a subagent, but **subagents cannot themselves delegate to further subagents**. Official guidance suggests serial prompting (ask the base model to call multiple agents in sequence), which still keeps delegation **single‑level**.
* **What that blocks**: A true **orchestrator agent** that decomposes work and **sub‑orchestrates** engineer/QA agents with verification loops, gates, retries, and per‑story commits.

### Our design goal

Enable a **real orchestrator** that:

* Builds a DAG of stories/phases
* Calls an **engineer** agent to implement+test
* Calls a **QA** agent to verify+scan+repair traceability
* Iterates (remediation packs) until GREEN—or stops on policy RED
* Executes **Phase Gate** (regression, PR/merge, header flip)
* Logs **evidence & summary** deterministically

---

## 2) The workaround (how we make nesting real)

We keep the visible contract (orchestrator + subagents), but **redirect nested work** through a controlled path:

1. **Hooks** (PreToolUse/UserPromptSubmit/SubagentStop)

   * *PreToolUse*: blocks the built‑in `Task` tool when the orchestrator tries to chain, and **steers it** to our runner/MCP tool.
   * *UserPromptSubmit*: injects orchestration state/policies into context.
   * *SubagentStop*: logs and lets us advance the DAG deterministically.

2. **Runner / MCP tool** (the "nesting engine")

   * A tiny script (`.claude/mcp/runner.py`) that **spawns child sessions** with your chosen backend and returns structured JSON.
   * Backends are pluggable drivers: **Claude**, **OpenAI Codex**, **Gemini** (and more later).
   * Results are persisted to `.claude/orchestration/state.json` for provenance.

3. **Per‑role backend mapping**

   * Choose backends **per role**: `orchestrator`, `engineer`, `qa` → `claude|codex|gemini`.
   * Set defaults and overrides in `orch.yaml` or via scaffolder flags.

**Net effect**: From Claude Code’s POV, the orchestrator is just calling a tool. In practice, that tool **creates and manages child agent sessions**, giving you **multi‑level orchestration behavior** with auditability.

---

## 3) What gets scaffolded (files & directories)

The scaffolder (e.g., `npx create-orch-kit`) generates a **drop‑in kit** under `.claude/` plus a starter phase file:

```
.claude/
  agents/
    orchestrator-core.md         # Orchestrator (methodology + routing to engineer/QA)
    golang-engineer.md           # MVP stack: Go engineer
    golang-qa.md                 # MVP stack: Go QA
  hooks/
    block_task_when_orchestrator.py
    inject_orchestration_context.py
    on_subagent_stop.py
  mcp/
    runner.py                    # Spawns child sessions on selected backend
    drivers/
      claude-code.yaml
      openai-codex.yaml
      gemini-cli.yaml
  settings.json                  # Hooks wiring
  orch.yaml                      # Policies, evidence paths, backend preferences
.pm/
  phase-go-1.md                  # Phase skeleton (stories, tasks, gate)

docs/SRS.md                      # Optional — used if present
.evidence/                        # Created on first run
```

Key configuration points:

* **`orch.yaml`**

  * `evidence_root`, `backend_preference_order`
  * `backends.{orchestrator|engineer|qa}` for per‑role mapping
  * `policies` (retries, lint/vet/coverage/vuln/secret thresholds, traceability repair)
* **Drivers** define how to call each backend CLI; only keep the ones you use.
* **Hooks** are conservative: block nested `Task`, inject state, log events.

---

## 4) The methodology we enforce

This kit encodes a production‑minded **phase → story → task** methodology:

* **P0: No failing tests** — any fail triggers remediation (engineer → QA loop) up to policy retry limits.
* **P1: Traceability required** — every requirement maps to tests and evidence (QA can minimally repair if policy allows).
* **P2: Evidence or it didn’t happen** — artifacts must be written to the exact paths (deterministic layout under `evidence/`).
* **P3: Security‑first** — fmt/imports, lint/vet/staticcheck, vuln & secret scans act as gates.
* **P4: Scope discipline** — execute stories strictly in order; no scope creep.

Operational rules:

* **Atomic increments** — one commit per story (Conventional Commits), hash captured in the summary.
* **Phase Gate** — full regression + PR/merge + header flip, verified by QA.
* **Deterministic logs** — orchestrator writes `log.md` + `summary.json` for audits and CI ingestion.
* **Vendor‑agnostic** — agents are pure prompts; the runner selects the backend at call time.

---

## 5) How a run actually flows

1. Orchestrator parses the phase file and builds a **DAG** of stories.
2. For each story, it calls the **engineer** (via runner) with a **Context Bundle** (paths, policies, prior activity).
3. Engineer returns status, evidence paths, and a **commit hash**.
4. Orchestrator calls **QA** to verify: tests, coverage, fmt/imports, lint/vet, vuln/secret scans, and traceability.
5. If QA is RED, orchestrator assembles a **Remediation Pack** and re‑runs engineer → QA within retry limits.
6. After stories, the **Phase Gate** runs (regression, PR, header flip) and is QA‑verified.
7. Orchestrator emits the **run log** and **summary JSON** and exits GREEN/AMBER/RED.

---

## 6) Why this helps (benefits)

* **True nested behavior** without waiting for platform changes.
* **Determinism**: hooks enforce the path; runner produces structured outputs.
* **Traceability & audits** built‑in (evidence tree + summary JSON).
* **Multi‑LLM**: pick the best agent per role; swap backends without rewriting prompts.
* **Extensible**: stacks are just agent files; add `dotnet` next, then more.

---

## 7) Limitations & tradeoffs

* **Not native**: we emulate nesting through a runner/MCP tool. If the platform later supports multi‑level subagents, you can retire the workaround with minimal changes.
* **Local CLIs required**: drivers assume CLIs (or SDKs) are installed and authenticated.
* **Hooks run with your privileges**: store in repo and review diffs; scope file paths; avoid unsafe commands.
* **Costs & rate limits**: child sessions are real model calls—configure concurrency and backoffs as needed.

---

## 8) Quick start (scaffolder UX)

```bash
# Scaffold into current repo with Go stack and per‑role backends
npx create-orch-kit@latest init \
  --stack golang \
  --backend-map orchestrator=claude,engineer=codex,qa=claude \
  --evidence-root ./evidence

# Then run your orchestrator inside Claude Code or via the driver directly
# (example prompt):
#   "Use the orchestrator to execute .pm/phase-go-1.md for stack=golang."
```

---

## 9) Extending the kit

* **Add a new stack**: drop `agents/<stack>-engineer.md` and `agents/<stack>-qa.md`, plus stack‑specific phase skeletons under `.pm/`.
* **Add a backend**: create a driver YAML in `.claude/mcp/drivers/` and reference it in `orch.yaml`.
* **CI support**: add a "doctor" job to verify hooks/agents/drivers exist and `orch.yaml` is valid.

---

## 10) FAQ

**Q: Why not just chain subagents in one prompt?**
A: The base model can serially call subagents, but subagents can’t **delegate further** themselves. Our runner/MCP indirection restores that capability with logs and policy control.

**Q: Can I mix backends?**
A: Yes—map roles independently (e.g., engineer=codex, qa=claude). You can bias each role to the backend that excels at that task.

**Q: Where are artifacts stored?**
A: Under `evidence/…` in deterministic paths; top‑level orchestrator writes `orchestrator/log.md` and `orchestrator/summary.json`.

**Q: Is this safe to run in CI?**
A: Yes—treat hooks as code. Pin CLIs, scope secrets, and review diffs. The design is CI‑friendly and produces machine‑readable outputs.
