import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generatePhase } from '../src/generate/phase.js';
import type { ChatClient } from '../src/ai/types.js';

class MockChat implements ChatClient {
  async generate(): Promise<string> {
    return JSON.stringify([
      { id: 'STORY-1.1', title: 'AI Story 1', task: 'Do something' },
      { id: 'STORY-1.2', title: 'AI Story 2', task: 'Do something else' }
    ]);
  }
}

const tmp = path.join(process.cwd(), '.tmp_test_phase');

describe('generatePhase', () => {
  beforeEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('writes default phase file', async () => {
    const out = await generatePhase({ target: tmp, stack: 'go' });
    const content = await fs.readFile(out, 'utf8');
    expect(content).toContain('PHASE-GO-1');
    expect(content).toMatch(/STORY-1\.1/);
  });

  it('writes AI-generated stories when client provided', async () => {
    const out = await generatePhase({ target: tmp, stack: 'go', aiClient: new MockChat() });
    const content = await fs.readFile(out, 'utf8');
    expect(content).toMatch(/AI Story 1/);
    expect(content).toMatch(/STORY-1\.2/);
  });
});

