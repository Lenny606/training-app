// Isomorphic model metadata — safe to import on the client (no provider SDKs
// here). The server-only adapter factory lives in `client.ts`; the client uses
// this list purely to render the provider picker and to label runs.

export type ModelId =
  'gpt-4o-mini' | 'gpt-5.2' | 'claude-opus-4.8' | 'claude-haiku-4-5'

export type Provider = 'anthropic' | 'openai'

export interface ModelInfo {
  id: ModelId
  label: string
  provider: Provider
}

// Default is GPT-4o mini (cheap OpenAI path); the Claude and GPT-5.2 options are
// here to demonstrate provider portability — same tools, same stream, swap the
// adapter. Requires OPENAI_API_KEY for the default provider.
export const DEFAULT_MODEL: ModelId = 'gpt-4o-mini'

export const MODELS: readonly ModelInfo[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai' },
  { id: 'gpt-5.2', label: 'GPT-5.2', provider: 'openai' },
  { id: 'claude-opus-4.8', label: 'Claude Opus 4.8', provider: 'anthropic' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic' },
]

/** Narrow untrusted input (request body) to a known model, falling back to the default. */
export function resolveModelId(input: unknown): ModelId {
  return MODELS.some((m) => m.id === input) ? (input as ModelId) : DEFAULT_MODEL
}
