import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AnyTool } from '@tanstack/ai'
import type { PlanRepository } from '../repositories/plan-repository'
import type { WorkoutLogRepository } from '../repositories/workout-log-repository'
import { buildTools } from './tools'

// Tools that delete or overwrite data — flagged so MCP clients ask the user
// before running them.
const DESTRUCTIVE = new Set(['delete_plan'])

// Tools whose effect only exists inside the browser UI (e.g. opening the timer).
const UI_ONLY = new Set(['start_workout'])

const INSTRUCTIONS = `Tools for the user's training app: create, edit and review training plans and workout logs.
All tools are already scoped to the token owner — never ask for a user id.
Call list_plans before referring to a plan by id. A plan has name, description, daysPerWeek (1–7) and ordered activities; each activity has name, type ('exercise' | 'rest' | 'learning'), duration in seconds, and optional sets, reps, weight, description.`

/**
 * MCP server exposing the same user-bound tool set as the in-app assistant
 * (`buildTools`), so a tool added there shows up in Claude Code too. Built per
 * request: the endpoint is stateless and every tool is scoped to `userId`.
 */
export function buildMcpServer(
  userId: string,
  repo: PlanRepository,
  logRepo?: WorkoutLogRepository,
): McpServer {
  const server = new McpServer(
    { name: 'training-app', version: '1.0.0' },
    { instructions: INSTRUCTIONS },
  )

  const tools: Array<AnyTool> = buildTools(userId, repo, logRepo)
  for (const tool of tools) {
    if (UI_ONLY.has(tool.name)) continue
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { destructiveHint: DESTRUCTIVE.has(tool.name) },
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await tool.execute?.(args)
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(result ?? null) },
            ],
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unexpected error'
          return {
            content: [{ type: 'text' as const, text: message }],
            isError: true,
          }
        }
      },
    )
  }

  return server
}
