import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateSRS } from '../src/generate/srs.js';
import type { ChatClient } from '../src/ai/types.js';

class MockChat implements ChatClient {
  async generate(): Promise<string> {
    return `| ID | Title | Description | Rationale |
| :--- | :--- | :--- | :--- |
| **PROD-001** | Example | MUST do a thing | Value |

| ID | Title | Description | Rationale |
| :--- | :--- | :--- | :--- |
| **USER-001** | CLI Help | MUST show help | Discoverability |`;
  }
}

const tmp = path.join(process.cwd(), '.tmp_test_srs');

describe('generateSRS', () => {
  beforeEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('writes SRS skeleton without AI', async () => {
    const out = await generateSRS({ target: tmp, project: 'docloom' });
    const content = await fs.readFile(out, 'utf8');
    expect(content).toContain('# docloom - Software Requirements Specification'.replace('docloom', 'docloom'));
    expect(content).toContain('## 1. Product & Functional Requirements');
  });

  it('writes SRS with AI tables', async () => {
    const out = await generateSRS({ target: tmp, project: 'docloom', aiClient: new MockChat() });
    const content = await fs.readFile(out, 'utf8');
    expect(content).toMatch(/\*\*PROD-001\*\*/);
    expect(content).toMatch(/\*\*USER-001\*\*/);
  });
});

