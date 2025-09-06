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

// add-stack implemented below
// doctor implemented below
// upgrade implemented below

type Ctx = { target: string; stack: string; evidenceRoot: string; backendMap: BackendMap };
type PlanItem = { outPath: string; mode: 'write'|'skip'; from?: string; templateVars?: Record<string, any> };

async function buildPlan(ctx: Ctx): Promise<PlanItem[]> {
  const items: PlanItem[] = [];
  const common = path.join(ROOT, 'src', 'common', 'templates');
  const stackDir = path.join(ROOT, 'src', 'stacks', ctx.stack, 'templates');

  const templateVars = mkTemplateVars(ctx);
  const files = await listAll([common, stackDir]);
  for (const f of files) {
    const base = f.abs.startsWith(common) ? common : stackDir;
    const relFromBase = path.relative(base, f.abs);
    // The template tree encodes the desired target root (e.g., ".claude/..." or ".pm/...")
    let out = path.join(ctx.target, relFromBase);
    if (out.endsWith('.ejs')) out = out.slice(0, -4);
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
    let shouldWrite = true;
    try { await fs.access(it.outPath); if (!force) { console.log(`skip (exists): ${it.outPath}`); shouldWrite = false; } } catch {}
    if (shouldWrite) {
      await fs.writeFile(it.outPath, out, 'utf8');
      // Mark scripts executable if they have a shebang
      if (out.startsWith('#!')) {
        try { await fs.chmod(it.outPath, 0o755); } catch {}
      }
      console.log(`write: ${it.outPath}`);
    }
  }
}

// ---- add-stack (render skeletons into computed paths) ----

export async function addStackCmd(targetOrName: string, maybeName?: string) {
  const target = maybeName ? targetOrName : '.';
  const name = maybeName ? maybeName : targetOrName;
  const skeleton = path.join(ROOT, 'src', 'stacks', '_skeleton', 'templates');
  const files = {
    engineer: path.join(skeleton, 'agents', 'engineer.md.ejs'),
    qa: path.join(skeleton, 'agents', 'qa.md.ejs'),
    phase: path.join(skeleton, 'phase.md.ejs'),
  } as const;
  for (const p of Object.values(files)) {
    try { await fs.access(p); } catch {
      console.error(kleur.red(`Skeleton template missing: ${p}`));
      process.exitCode = 1; return;
    }
  }
  const vars = { stack: name };
  const outputs = [
    { src: files.engineer, out: path.join(target, '.claude', 'agents', `${name}-engineer.md`) },
    { src: files.qa,       out: path.join(target, '.claude', 'agents', `${name}-qa.md`) },
    { src: files.phase,    out: path.join(target, '.pm', `phase-${name}-1.md`) },
  ];
  for (const o of outputs) {
    await fs.mkdir(path.dirname(o.out), { recursive: true });
    const raw = await fs.readFile(o.src, 'utf8');
    const rendered = await ejs.render(raw, vars, { async: false });
    await fs.writeFile(o.out, rendered, 'utf8');
    console.log(`write: ${o.out}`);
  }
  console.log(kleur.green(`\n✓ Added stack '${name}'.`));
}

// ---- doctor: validate presence of key files ----

export async function doctorCmd(target = '.') {
  const checks: { label: string; path: string; mustExist: boolean }[] = [
    { label: 'orch.yaml', path: path.join(target, '.claude', 'orch.yaml'), mustExist: true },
    { label: 'settings.json', path: path.join(target, '.claude', 'settings.json'), mustExist: true },
    { label: 'runner.py', path: path.join(target, '.claude', 'mcp', 'runner.py'), mustExist: true },
    { label: 'drivers dir', path: path.join(target, '.claude', 'mcp', 'drivers'), mustExist: true },
    { label: 'hook: block_task_when_orchestrator.py', path: path.join(target, '.claude', 'hooks', 'block_task_when_orchestrator.py'), mustExist: true },
    { label: 'hook: inject_orchestration_context.py', path: path.join(target, '.claude', 'hooks', 'inject_orchestration_context.py'), mustExist: true },
    { label: 'hook: on_subagent_stop.py', path: path.join(target, '.claude', 'hooks', 'on_subagent_stop.py'), mustExist: true },
    { label: 'agent: orchestrator-core.md', path: path.join(target, '.claude', 'agents', 'orchestrator-core.md'), mustExist: true },
  ];
  let failed = 0;
  for (const c of checks) {
    try { await fs.access(c.path); console.log(kleur.green(`✓ ${c.label}`)); }
    catch { console.log(kleur.red(`✗ ${c.label} missing at ${c.path}`)); failed++; }
  }
  // At least one driver file
  try {
    const driverDir = path.join(target, '.claude', 'mcp', 'drivers');
    const list = await fs.readdir(driverDir);
    if (list.some(f => f.endsWith('.yaml') || f.endsWith('.yml'))) console.log(kleur.green('✓ drivers present'));
    else { console.log(kleur.red('✗ no driver YAMLs found')); failed++; }
  } catch { /* already counted above */ }
  // At least one stack agent pair
  try {
    const agentsDir = path.join(target, '.claude', 'agents');
    const list = await fs.readdir(agentsDir);
    const stacks = new Set(list.filter(f => f.endsWith('-engineer.md')).map(f => f.replace(/-engineer.md$/, '')));
    let ok = false;
    for (const s of stacks) { if (list.includes(`${s}-qa.md`)) { ok = true; break; } }
    if (ok) console.log(kleur.green('✓ at least one stack agents pair present'));
    else { console.log(kleur.red('✗ missing stack agents (engineer/qa)')); failed++; }
  } catch { console.log(kleur.red('✗ agents directory missing')); failed++; }
  // Optional: SRS
  try { await fs.access(path.join(target, 'docs', 'SRS.md')); console.log(kleur.green('✓ docs/SRS.md present')); } catch { console.log(kleur.yellow('! docs/SRS.md not found (optional)')); }

  if (failed > 0) { console.log(kleur.red(`\nDoctor found ${failed} problem(s).`)); process.exitCode = 1; }
  else console.log(kleur.green('\nDoctor: all checks passed.'));
}

// ---- upgrade: reapply templates safely ----

export async function upgradeCmd(target = '.', opts: any = {}) {
  const stack = opts.stack as string | undefined;
  const force = !!opts.force;
  const evidenceRoot = opts.evidenceRoot || './evidence';
  const backendMap: BackendMap = parseBackendMap(opts.backendMap);
  if (!stack) {
    console.log(kleur.yellow('No --stack provided. Upgrading common templates only.'));
  }
  const items: PlanItem[] = [];
  // common
  const common = path.join(ROOT, 'src', 'common', 'templates');
  const commonFiles = await listAll([common]);
  const vars = mkTemplateVars({ target, stack: stack || 'golang', evidenceRoot, backendMap });
  for (const f of commonFiles) {
    const rel = path.relative(common, f.abs);
    let out = path.join(target, rel);
    if (out.endsWith('.ejs')) out = out.slice(0, -4);
    items.push({ outPath: out, mode: 'write', from: f.abs, templateVars: vars });
  }
  // optional stack
  if (stack) {
    const stackDir = path.join(ROOT, 'src', 'stacks', stack, 'templates');
    try { await fs.access(stackDir); } catch { console.log(kleur.red(`Stack templates not found for '${stack}'.`)); process.exitCode = 1; return; }
    const stackFiles = await listAll([stackDir]);
    for (const f of stackFiles) {
      const rel = path.relative(stackDir, f.abs);
      let out = path.join(target, rel);
      if (out.endsWith('.ejs')) out = out.slice(0, -4);
      items.push({ outPath: out, mode: 'write', from: f.abs, templateVars: vars });
    }
  }
  renderPlan(items, { dryRun: !!opts.dryRun });
  if (opts.dryRun) return;
  await applyPlan(items, { force });
  console.log(kleur.green('\n✓ Upgrade completed.'));
}
