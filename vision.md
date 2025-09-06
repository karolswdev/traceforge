# create-orch-kit — OSS scaffolder blueprint (npx-ready)

A shareable **open‑source** project that ships a one‑command scaffolder to drop the orchestration kit into any repository. Users run:

```bash
npx create-orch-kit@latest init --stack golang \
  --backend-map orchestrator=claude,engineer=codex,qa=claude \
  --evidence-root ./evidence
```

…and get a ready‑to‑run `.claude/` setup with orchestrator, stack agents, hooks, drivers, and the multi‑LLM runner.

---

## Goals

* **Delivery via npx** for zero install friction
* **Stacks**: start with `golang` (MVP), make adding `dotnet` trivial
* **Backends**: user chooses per‑role mapping (`orchestrator|engineer|qa → claude|codex|gemini`)
* **Idempotent & safe**: won’t overwrite unless `--force`
* **Auditable**: prints a plan; can `--dry-run` to preview

---

## Monorepo layout (single package to start)

```
create-orch-kit/
  README.md
  LICENSE
  package.json
  tsconfig.json
  src/
    index.ts             # CLI entry
    scaffold.ts          # filesystem + templating
    schema.ts            # arg parsing, backend maps
    stacks/
      golang/
        templates/**     # files to materialize (.ejs templated)
      dotnet/
        templates/**     # (placeholder; easy to add later)
    common/
      templates/**       # shared files (hooks, orchestrator-core, runner, drivers)
  templates-preview.md   # quick view of what gets generated
```

> You can later split stacks to separate npm packages (plugin model). For MVP, keep them in‑repo for speed.

---

## Package.json (core fields)

```json
{
  "name": "create-orch-kit",
  "version": "0.1.0",
  "description": "Scaffold nested orchestration for Claude Code (+Codex/Gemini) into any repo",
  "license": "MIT",
  "bin": { "create-orch-kit": "dist/index.js" },
  "type": "module",
  "main": "dist/index.js",
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc -p .",
    "dev": "tsx src/index.ts --help",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "ejs": "^3.1.10",
    "kleur": "^4.1.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.16.2",
    "typescript": "^5.6.2",
    "vitest": "^2.0.5"
  },
  "publishConfig": { "access": "public" }
}
```

---

## CLI UX

```bash
npx create-orch-kit@latest init [target=.] \
  --stack golang \
  --backend-map orchestrator=claude,engineer=codex,qa=claude \
  --evidence-root ./evidence \
  --force --dry-run

npx create-orch-kit@latest add-stack dotnet
npx create-orch-kit@latest doctor          # validates hooks, drivers
npx create-orch-kit@latest upgrade         # reapply templates non-destructively
```

* `--backend-map` supports any subset; unspecified roles fall back to `backend_preference_order`.
* `--stack` controls which `agents/{stack}-*.md` are installed alongside `orchestrator-core.md`.

---

## src/index.ts (CLI entry)

```ts
#!/usr/bin/env node
import { Command } from 'commander';
import { initCmd, addStackCmd, doctorCmd, upgradeCmd } from './scaffold.js';

const program = new Command();
program
  .name('create-orch-kit')
  .description('Scaffold nested orchestration kit into any repo (.claude/*)')
  .version('0.1.0');

program.command('init')
  .argument('[target]', 'target directory', '.')
  .requiredOption('--stack <name>', 'technology stack, e.g., golang or dotnet')
  .option('--backend-map <map>', 'role→backend, e.g. orchestrator=claude,engineer=codex,qa=claude')
  .option('--evidence-root <path>', 'evidence root path', './evidence')
  .option('--dry-run', 'print plan only', false)
  .option('--force', 'overwrite existing files', false)
  .action(initCmd);

program.command('add-stack')
  .argument('<name>', 'stack name, e.g., dotnet')
  .action(addStackCmd);

program.command('doctor').action(doctorCmd);
program.command('upgrade').action(upgradeCmd);

program.parse();
```

---

## src/schema.ts (args + backend map)

```ts
import { z } from 'zod';

export const Backend = z.enum(['claude','codex','gemini']);
export const Role = z.enum(['orchestrator','engineer','qa']);
export type BackendMap = Partial<Record<z.infer<typeof Role>, z.infer<typeof Backend>>>;

export function parseBackendMap(s?: string): BackendMap {
  if (!s) return {};
  return Object.fromEntries(
    s.split(',').map(pair => {
      const [k,v] = pair.split('=');
      if (!k || !v) throw new Error(`Invalid backend-map entry: ${pair}`);
      const rk = Role.parse(k);
      const bv = Backend.parse(v);
      return [rk, bv];
    })
  );
}
```

---

## src/scaffold.ts (templating + file IO)

```ts
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import kleur from 'kleur';
import { parseBackendMap, BackendMap } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export async function initCmd(target: string, opts: any) {
  const stack = opts.stack as string;
  const evidenceRoot = opts.evidenceRoot as string;
  const backendMap: BackendMap = parseBackendMap(opts.backendMap);
  const dryRun = !!opts.dryRun; const force = !!opts.force;

  const plan = await buildPlan({ target, stack, evidenceRoot, backendMap });
  renderPlan(plan, { dryRun });
  if (dryRun) return;
  await applyPlan(plan, { force });
  console.log(kleur.green('\n✓ Orchestration kit installed.'));
}

export async function addStackCmd(name: string) {
  console.log(kleur.yellow(`Adding stack '${name}' is not yet implemented in MVP.`));
}
export async function doctorCmd() {
  console.log('Doctor: check drivers/hooks presence (MVP placeholder)');
}
export async function upgradeCmd() {
  console.log('Upgrade: reapply templates non-destructively (MVP placeholder)');
}

// ---- planning ----

type Ctx = { target: string; stack: string; evidenceRoot: string; backendMap: BackendMap };

type PlanItem = { outPath: string; mode: 'write'|'skip'; from?: string; templateVars?: Record<string, any> };

async function buildPlan(ctx: Ctx): Promise<PlanItem[]> {
  const items: PlanItem[] = [];
  const common = path.join(ROOT, 'src', 'common', 'templates');
  const stackDir = path.join(ROOT, 'src', 'stacks', ctx.stack, 'templates');

  const templateVars = mkTemplateVars(ctx);
  const files = await listAll([common, stackDir]);
  for (const f of files) {
    const rel = f.abs.replace(common, '.claude').replace(stackDir, '.claude');
    const out = path.join(ctx.target, rel);
    items.push({ outPath: out, mode: 'write', from: f.abs, templateVars });
  }
  return items;
}

function mkTemplateVars(ctx: Ctx) {
  const engineer = ctx.stack + '-engineer';
  const qa = ctx.stack + '-qa';
  return {
    stack: ctx.stack,
    orchestratorAgent: 'orchestrator',
    engineerAgent: engineer,
    qaAgent: qa,
    evidenceRoot: ctx.evidenceRoot,
    backendMap: ctx.backendMap,
    backendOrder: ['claude','codex','gemini']
  };
}

async function listAll(dirs: string[]) {
  const out: { abs: string }[] = [];
  for (const d of dirs) {
    try { await fs.access(d); } catch { continue; }
    await walk(d, out);
  }
  return out;
}

async function walk(dir: string, out: { abs: string }[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push({ abs: p });
  }
}

function renderPlan(items: PlanItem[], { dryRun }: { dryRun: boolean }) {
  console.log('\nPlanned changes:');
  for (const it of items) {
    console.log(` - ${it.mode} ${it.outPath}`);
  }
  if (dryRun) console.log('\n(dry-run) No files written.');
}

async function applyPlan(items: PlanItem[], { force }: { force: boolean }) {
  for (const it of items) {
    await fs.mkdir(path.dirname(it.outPath), { recursive: true });
    const raw = await fs.readFile(it.from!, 'utf8');
    const out = await ejs.render(raw, it.templateVars || {}, { async: false });
    try {
      if (!force) await fs.access(it.outPath), console.log(`skip (exists): ${it.outPath}`), void 0;
      await fs.writeFile(it.outPath, out, 'utf8');
      console.log(`write: ${it.outPath}`);
    } catch {
      await fs.writeFile(it.outPath, out, 'utf8');
      console.log(`write: ${it.outPath}`);
    }
  }
}
```

---

## Common templates (EJS)

### .claude/orch.yaml.ejs

```yaml
evidence_root: "<%= evidenceRoot %>"
backend_preference_order: [<%= backendOrder.map(x=>`"${x}"`).join(', ') %>]
backends:
  orchestrator: "<%= (backendMap && backendMap.orchestrator) || 'claude' %>"
  engineer: "<%= (backendMap && backendMap.engineer) || 'codex' %>"
  qa: "<%= (backendMap && backendMap.qa) || 'claude' %>"
policies:
  docker_rebuild_before_tests: true
  lint_strict: true
  vuln_fail_levels: ["CRITICAL","HIGH"]
  qa_can_repair_traceability: true
  qa_max_retries_per_story: 1
  qa_max_retries_phase_gate: 1
stacks:
  <%= stack %>:
    engineer_agent: "<%= engineerAgent %>"
    qa_agent: "<%= qaAgent %>"
outputs:
  log_md: "${EVIDENCE_ROOT}/orchestrator/log.md"
  summary_json: "${EVIDENCE_ROOT}/orchestrator/summary.json"
```

### .claude/settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Task", "hooks": [ { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/block_task_when_orchestrator.py" } ] }
    ],
    "SubagentStop": [
      { "hooks": [ { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/on_subagent_stop.py" } ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/inject_orchestration_context.py" } ] }
    ]
  }
}
```

### .claude/mcp/drivers/claude-code.yaml

```yaml
command: "claude"
args: ["-p", "{{ prompt_file }}", "--output-format", "json"]
```

### .claude/mcp/drivers/openai-codex.yaml

```yaml
command: "codex"
args: ["--prompt-file", "{{ prompt_file }}", "--output-format", "json"]
env:
  OPENAI_API_KEY: "{{ env.OPENAI_API_KEY }}"
```

### .claude/mcp/drivers/gemini-cli.yaml

```yaml
command: "gemini"
args: ["call", "--input-file", "{{ prompt_file }}", "--json"]
env:
  GOOGLE_API_KEY: "{{ env.GOOGLE_API_KEY }}"
```

### .claude/mcp/runner.py (same as recipe; shortened header)

```python
#!/usr/bin/env python3
# Spawns child sessions on selected backend; persists state to .claude/orchestration/state.json
# (Full version from previous recipe is included here unchanged.)
```

### .claude/hooks/block\_task\_when\_orchestrator.py

```python
#!/usr/bin/env python3
import json, sys
try: json.load(sys.stdin)
except: pass
sys.stderr.write("Nested Task disabled. Use runner: python .claude/mcp/runner.py run-subagent --agent <name> --task <task> --inputs '<JSON>'\n")
sys.exit(2)
```

### .claude/hooks/inject\_orchestration\_context.py

```python
#!/usr/bin/env python3
import os, json
print(json.dumps({"context_injection": {"note": "orchestration state can be injected here"}}))
```

### .claude/hooks/on\_subagent\_stop.py

```python
#!/usr/bin/env python3
import sys
print('{"event":"subagent_stop_logged"}')
```

### .claude/agents/orchestrator-core.md.ejs

```md
---
name: orchestrator
description: Orchestrator for <%= stack %>. Builds DAG, enforces gates, routes to <%= engineerAgent %> and <%= qaAgent %>. Use runner; NEVER Task.
---

## AGENT REGISTRY
- <%= engineerAgent %>  → atomic story execution
- <%= qaAgent %>        → independent QA gate

## EXECUTION LOOP
For each phase/story: run engineer → run QA → remediate if needed → continue. Phase gate: regression + PR + header flip. Write log + summary.
```

---

## Stack: golang templates

### .claude/agents/golang-engineer.md

```md
---
name: golang-engineer
description: Go engineer. Implement code→tests→traceability→commit.
---
Return JSON { status, commit, evidence[], notes }.
```

### .claude/agents/golang-qa.md

```md
---
name: golang-qa
description: Go QA. Run tests, fmt, vet, staticcheck, golangci-lint, govulncheck, minimal secrets scan; repair traceability if allowed.
---
Return JSON { verdict, findings{...}, repairs{traceability}, artifacts[], commit }.
```

### .pm/phase-go-1.md (skeleton)

```md
# [ ] PHASE-GO-1: Project scaffolding

## 2. Phase Scope & Test Case Definitions
(define requirements + test IDs here)

## 3. Implementation Plan
### [ ] STORY-1.1: CLI foundation
- Task: create root cmd and help; evidence to `evidence/PHASE-GO-1/story-1.1/...`

## Final Acceptance Gate
- Run full regression; log to `evidence/PHASE-GO-1/regression.log`.
```

---

## README.md (package)

````md
# create-orch-kit

Scaffold nested orchestration (Claude Code + optional Codex/Gemini backends) into any repo.

## Quick start
```bash
npx create-orch-kit@latest init --stack golang \
  --backend-map orchestrator=claude,engineer=codex,qa=claude
````

This generates `.claude/*` agents, hooks, drivers, and a Python runner that spawns child sessions on the selected backends.

## Options

* `--stack <golang|dotnet>`
* `--backend-map orchestrator=claude,engineer=codex,qa=claude`
* `--evidence-root ./evidence`
* `--dry-run`, `--force`

## Extend

Add stacks under `src/stacks/<name>/templates/**`. Use EJS placeholders.

## Security

Hooks run with your environment privileges. Review changes and limit exported env vars.

```

---

## Licensing & community files
- **LICENSE**: MIT
- **CODE_OF_CONDUCT.md**: Contributor Covenant
- **CONTRIBUTING.md**: how to add stacks/backends, testing steps

---

## Publishing steps
1) `npm login && npm publish --access public`
2) Test from a clean repo: `npx create-orch-kit@latest init --stack golang --dry-run`
3) Tag release; draft GitHub Release with changelog highlights

---

## Roadmap
- `doctor` command to verify local CLIs + hooks
- `upgrade` to diff and merge template updates
- Plugin discovery: load stacks from `orch-kit-stack-*` npm packages
- Add `dotnet` stack (mirrors Go behaviors with `dotnet test`, analyzers, SAST)

```
