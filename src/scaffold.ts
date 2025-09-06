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
    const out = path.join(ctx.target, relFromBase);
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
      console.log(`write: ${it.outPath}`);
    }
  }
}
