import path from 'node:path';
import fs from 'node:fs/promises';
import kleur from 'kleur';
import type { ChatClient } from '../ai/types.js';

export type PhaseOptions = {
  target: string;
  stack: string;
  phaseId?: string; // e.g., PHASE-GO-1
  title?: string;
  aiClient?: ChatClient;
};

export async function phaseCommand(target: string, opts: any) {
  const stack = opts.stack as string | undefined;
  if (!stack) throw new Error('--stack is required');
  const aiClient: ChatClient | undefined = (opts.ai && opts.getClient) ? opts.getClient() : undefined;
  const out = await generatePhase({ target, stack, phaseId: opts.id, title: opts.title, aiClient });
  console.log(kleur.green(`Phase file written to ${out}`));
}

export async function generatePhase({ target, stack, phaseId, title, aiClient }: PhaseOptions) {
  const PHASE = phaseId || `PHASE-${stack.toUpperCase()}-1`;
  const titleLine = title || 'Starter phase';
  let stories = [
    { id: 'STORY-1.1', title: 'CLI foundation', task: 'create root cmd and help' },
    { id: 'STORY-1.2', title: 'Templates', task: 'add orchestrator/agents/hooks templates' },
  ];
  if (aiClient) {
    const sys = 'You output JSON only.';
    const prompt = `Propose 3-5 user stories for a ${stack} stack phase. Return JSON array of {id,title,task}. IDs start with STORY-1.x.`;
    try {
      const content = await aiClient.generate(prompt, sys);
      const jsonStart = content.indexOf('[');
      if (jsonStart >= 0) {
        const arr = JSON.parse(content.slice(jsonStart));
        if (Array.isArray(arr) && arr.length) stories = arr;
      }
    } catch {}
  }
  const lines = [
    `# [ ] ${PHASE}: ${titleLine}`,
    '',
    '## 2. Phase Scope & Test Case Definitions',
    '(define requirements + test IDs here)',
    '',
    '## 3. Implementation Plan',
  ];
  for (const s of stories) {
    lines.push(`### [ ] ${s.id}: ${s.title}`);
    lines.push(`- Task: ${s.task}; evidence to \`evidence/${PHASE}/${s.id.toLowerCase()}/...\``);
    lines.push('');
  }
  lines.push('## Final Acceptance Gate');
  lines.push(`- Run full regression; log to \`evidence/${PHASE}/regression.log\`.`);
  lines.push('');
  const outPath = path.join(target, '.pm', `phase-${stack}-1.md`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, lines.join('\n'), 'utf8');
  return outPath;
}

