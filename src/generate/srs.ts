import path from 'node:path';
import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import kleur from 'kleur';
import type { ChatClient } from '../ai/types.js';

export type SrsOptions = {
  target: string;
  project: string;
  version?: string;
  status?: string;
  interactive?: boolean;
  aiClient?: ChatClient;
};

export async function srsCommand(target: string, opts: any) {
  const project = opts.project as string | undefined;
  if (!project && !opts.interactive) throw new Error('--project is required (or use --interactive).');
  const aiClient: ChatClient | undefined = (opts.ai && opts.getClient) ? opts.getClient() : undefined;
  const out = await generateSRS({
    target,
    project: project || '',
    version: opts.version || '1.0',
    status: opts.status || 'Baseline',
    interactive: !!opts.interactive,
    aiClient,
  });
  console.log(kleur.green(`SRS written to ${out}`));
}

export async function generateSRS({ target, project, version='1.0', status='Baseline', interactive=false, aiClient }: SrsOptions) {
  if (interactive) {
    const rl = readline.createInterface({ input, output });
    project = project || await rl.question('Project name: ');
    version = await rl.question(`Version [${version}]: `) || version;
    status = await rl.question(`Status [${status}]: `) || status;
    await rl.close();
  }
  const docHeader = `# ${project} - Software Requirements Specification\n\n**Version:** ${version}  \n**Status:** ${status}\n`;
  const intro = `\n## Introduction\n\nThis document outlines the software requirements for **${project}**. It serves as the single source of truth for what the system must do, the constraints under which it must operate, and the rules governing its development and deployment.\n\nEach requirement has a **unique, stable ID** (e.g., \`PROD-001\`). These IDs **MUST** be used to link implementation stories and test cases back to these foundational requirements, ensuring complete traceability.\n\nThe requirement keywords (\`MUST\`, \`MUST NOT\`, \`SHOULD\`, \`SHOULD NOT\`, \`MAY\`) are used as defined in RFC 2119.\n\n---\n`;
  const tablesSkeleton = `\n## 1. Product & Functional Requirements\n\n*Defines what the system does; its core features and capabilities.*\n\n| ID | Title | Description | Rationale |\n| :--- | :--- | :--- | :--- |\n`;
  let frTable = `| **PROD-001** | Core Capability | The system **MUST** deliver its primary value proposition. | Defines MVP scope.\n`;
  let userReq = `\n---\n\n## 2. User Interaction Requirements\n\n*Defines how a user interacts with the system. Focuses on usability and user‑facing workflows.*\n\n| ID | Title | Description | Rationale |\n| :--- | :--- | :--- | :--- |\n| **USER-001** | CLI Help | The CLI **MUST** provide \`--help\` with examples. | Improves discoverability.\n`;
  const archNfrTech = `\n---\n\n## 3. Architectural Requirements\n\n*Defines high‑level, non‑negotiable design principles and structural constraints.*\n\n| ID | Title | Description | Rationale |\n| :--- | :--- | :--- | :--- |\n| **ARCH-001** | Deterministic Scaffolding | The kit **MUST** be idempotent with \`--force\`. | Safe usage.\n\n---\n\n## 4. Non-Functional Requirements (NFRs)\n\n*Defines the quality attributes and operational characteristics of the system.*\n\n| ID | Title | Description | Rationale |\n| :--- | :--- | :--- | :--- |\n| **NFR-001** | Security | Hooks **MUST** avoid unsafe commands and be reviewable. | Safety.\n\n---\n\n## 5. Technology & Platform Requirements\n\n| ID | Title | Description | Rationale |\n| :--- | :--- | :--- | :--- |\n| **TECH-001** | Node.js 18+ | The CLI **MUST** run on Node.js 18+. | Compatibility.\n\n---\n\n## 6. Operational & DevOps Requirements\n\n| ID | Title | Description | Rationale |\n| :--- | :--- | :--- | :--- |\n| **DEV-001** | Conventional Commits | Commits **MUST** follow Conventional Commits. | Enables changelogs.\n`;

  if (aiClient) {
    const sys = 'You draft Markdown SRS tables. Keep it concise and valid Markdown.';
    const prompt = `Project: ${project}. Provide a Product & Functional Requirements table with 5-8 rows using IDs PROD-001.., and a User Interaction table with 3-5 rows using IDs USER-001.. . Columns: ID, Title, Description (with MUST/SHOULD), Rationale. Output only the two Markdown tables without headings.`;
    try {
      const content = await aiClient.generate(prompt, sys);
      const parts = content.trim().split(/\n\s*\n/);
      if (parts.length >= 2) {
        frTable = parts[0] + '\n';
        userReq = '\n---\n\n## 2. User Interaction Requirements\n\n*Defines how a user interacts with the system. Focuses on usability and user‑facing workflows.*\n\n' + parts[1] + '\n';
      } else {
        frTable = content + '\n';
      }
    } catch (e) {
      // fall back to skeleton
    }
  }

  const body = docHeader + intro + tablesSkeleton + frTable + userReq + archNfrTech;
  const outPath = path.join(target, 'docs', 'SRS.md');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, body, 'utf8');
  return outPath;
}

