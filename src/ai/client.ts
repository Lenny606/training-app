import { anthropicText } from '@tanstack/ai-anthropic'
import { openaiText } from '@tanstack/ai-openai'
import type { AnyTextAdapter } from '@tanstack/ai/adapters'
import { type ModelId, type Provider } from './models'

// SERVER-ONLY. Imports the provider SDKs (@anthropic-ai/sdk, openai), which must
// never reach the client bundle — only import this from the chat server route.

const ENV_KEY: Record<Provider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
}

const FACTORIES: Record<
  ModelId,
  { provider: Provider; create: () => AnyTextAdapter }
> = {
  'gpt-4o-mini': {
    provider: 'openai',
    create: () => openaiText('gpt-4o-mini'),
  },
  'gpt-5.2': { provider: 'openai', create: () => openaiText('gpt-5.2') },
  'claude-opus-4.8': {
    provider: 'anthropic',
    create: () => anthropicText('claude-opus-4.8'),
  },
  'claude-haiku-4-5': {
    provider: 'anthropic',
    create: () => anthropicText('claude-haiku-4-5'),
  },
}

/**
 * Builds the text adapter for a model. The provider key is read from env
 * (never the client): fail-fast in production, warn in dev so the app stays
 * runnable without keys until you actually hit the endpoint.
 */
export function createAdapter(id: ModelId): AnyTextAdapter {
  const spec = FACTORIES[id]
  const envKey = ENV_KEY[spec.provider]
  if (!process.env[envKey]) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${envKey} is required to use model "${id}".`)
    }
    console.warn(
      `[ai] ${envKey} is not set — requests to "${id}" will fail until it is configured.`,
    )
  }
  return spec.create()
}
