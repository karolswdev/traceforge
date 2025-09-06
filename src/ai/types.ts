export interface ChatClientOptions {
  model: string;
  baseURL?: string;
  apiKey?: string;
}

export interface ChatClient {
  generate(prompt: string, sys?: string): Promise<string>;
}

