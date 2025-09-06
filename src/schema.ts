import { z } from 'zod';

export const Backend = z.enum(['claude','codex','gemini']);
export const Role = z.enum(['orchestrator','engineer','qa']);
export type BackendMap = Partial<Record<z.infer<typeof Role>, z.infer<typeof Backend>>>;

export function parseBackendMap(s?: string): BackendMap {
  if (!s) return {};
  const map: Record<string,string> = {};
  for (const pair of s.split(',')) {
    const [k,v] = pair.split('=');
    if (!k || !v) throw new Error(`Invalid backend-map entry: ${pair}`);
    const rk = Role.parse(k);
    const bv = Backend.parse(v);
    map[rk] = bv;
  }
  return map as BackendMap;
}

