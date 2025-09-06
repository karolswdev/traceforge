#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');
import { initCmd, addStackCmd, doctorCmd, upgradeCmd } from './scaffold.js';
import { srsCommand } from './generate/srs.js';
import { phaseCommand } from './generate/phase.js';
import { OpenAIChat } from './ai/openai.js';

const program = new Command();
program
  .name(pkg.name || 'traceforge')
  .description('Scaffold nested orchestration kit into any repo (.claude/*)')
  .version(pkg.version || '0.1.0');

program.command('init')
  .argument('[target]', 'target directory', '.')
  .requiredOption('--stack <name>', 'technology stack, e.g., golang or dotnet')
  .option('--backend-map <map>', 'role→backend, e.g. orchestrator=claude,engineer=codex,qa=claude')
  .option('--evidence-root <path>', 'evidence root path', './evidence')
  .option('--dry-run', 'print plan only', false)
  .option('--force', 'overwrite existing files', false)
  .action(initCmd);

program.command('add-stack')
  .argument('[target]', 'target directory', '.')
  .argument('<name>', 'stack name, e.g., dotnet')
  .action((target, name) => addStackCmd(target, name));

program.command('doctor')
  .argument('[target]', 'target directory', '.')
  .action((target) => doctorCmd(target));

program.command('upgrade')
  .argument('[target]', 'target directory', '.')
  .option('--stack <name>', 'stack to upgrade (reapply)')
  .option('--backend-map <map>', 'role→backend, e.g. orchestrator=claude,engineer=codex,qa=claude')
  .option('--evidence-root <path>', 'evidence root path', './evidence')
  .option('--dry-run', 'print plan only', false)
  .option('--force', 'overwrite existing files', false)
  .action((target, opts) => upgradeCmd(target, opts));

// --- AI-assisted generation commands ---
function getAiFactory(opts: any) {
  return () => new OpenAIChat({ model: opts.model || 'gpt-4o-mini', baseURL: opts.baseUrl, apiKey: opts.apiKey });
}

program.command('gen-srs')
  .argument('[target]', 'target directory', '.')
  .requiredOption('--project <name>', 'project name', '')
  .option('--version <v>', 'SRS version', '1.0')
  .option('--status <s>', 'SRS status', 'Baseline')
  .option('--interactive', 'interactive mode', false)
  .option('--ai', 'use OpenAI-compatible generation for tables', false)
  .option('--model <m>', 'model name', 'gpt-4o-mini')
  .option('--base-url <u>', 'OpenAI-compatible base URL')
  .option('--api-key <k>', 'API key (or env OPENAI_API_KEY)')
  .action((target, opts) => srsCommand(target, { ...opts, getClient: () => getAiFactory(opts)() }));

program.command('gen-phase')
  .argument('[target]', 'target directory', '.')
  .requiredOption('--stack <name>', 'stack name, e.g., golang')
  .option('--id <id>', 'phase id, e.g., PHASE-GO-1')
  .option('--title <t>', 'phase title')
  .option('--ai', 'use OpenAI-compatible generation for stories', false)
  .option('--model <m>', 'model name', 'gpt-4o-mini')
  .option('--base-url <u>', 'OpenAI-compatible base URL')
  .option('--api-key <k>', 'API key (or env OPENAI_API_KEY)')
  .action((target, opts) => phaseCommand(target, { ...opts, getClient: () => getAiFactory(opts)() }));

program.parse();
