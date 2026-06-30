// Repository contract (interface + domain errors). Implementations are
// server-only (see ./sqlite-plan-repository) and consumed via server functions
// in src/server/plans.ts — never imported directly by the client.
export * from './plan-repository'
