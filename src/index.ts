#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');
import { initCmd, addStackCmd, doctorCmd, upgradeCmd } from './scaffold.js';

const program = new Command();
program
  .name(pkg.name || 'create-orch-kit')
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
  .argument('<name>', 'stack name, e.g., dotnet')
  .action(addStackCmd);

program.command('doctor').action(doctorCmd);
program.command('upgrade').action(upgradeCmd);

program.parse();
