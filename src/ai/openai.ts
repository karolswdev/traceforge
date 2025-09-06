import type { ChatClient, ChatClientOptions } from './types.js';

export class OpenAIChat implements ChatClient {
  private model: string;
  private baseURL: string;
  private apiKey: string | undefined;
  constructor(opts: ChatClientOptions) {
    this.model = opts.model;
    this.baseURL = (opts.baseURL || 'https://api.openai.com').replace(/\/$/, '');
    this.apiKey = opts.apiKey || process.env.OPENAI_API_KEY;
    if (!this.apiKey) throw new Error('OPENAI_API_KEY not set and no apiKey provided');
  }
  async generate(prompt: string, sys = 'You are a helpful assistant that outputs concise Markdown.') {
    const url = `${this.baseURL}/v1/chat/completions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`OpenAI error: ${resp.status} ${resp.statusText} ${txt}`);
    }
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from OpenAI response');
    return content as string;
  }
}

