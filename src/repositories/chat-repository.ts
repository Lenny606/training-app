// SERVER-ONLY — never import from the client bundle.

import { eq, asc } from 'drizzle-orm'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import {
  chatSessions,
  chatMessages,
  type ChatSessionRow,
  type ChatMessageRow,
} from '../db/schema'

export type NewMessageParams = {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  /** Full serialised UIMessage parts array — stored as JSON text. */
  parts?: unknown
}

export class ChatRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------

  /**
   * Finds the most recent session for a user+model pair, or creates a new one.
   * The `sessionId` is the stable identifier forwarded from the client.
   */
  findSession(sessionId: string): ChatSessionRow | undefined {
    return this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .get()
  }

  createSession(
    sessionId: string,
    userId: string,
    modelId: string,
  ): ChatSessionRow {
    const now = new Date()
    this.db.insert(chatSessions).values({
      id: sessionId,
      userId,
      modelId,
      createdAt: now,
      updatedAt: now,
    }).run()

    return this.findSession(sessionId)!
  }

  ensureSession(
    sessionId: string,
    userId: string,
    modelId: string,
  ): ChatSessionRow {
    return (
      this.findSession(sessionId) ?? this.createSession(sessionId, userId, modelId)
    )
  }

  touchSession(sessionId: string): void {
    this.db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId))
      .run()
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  getMessages(sessionId: string): ChatMessageRow[] {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
      .all()
  }

  saveMessage(params: NewMessageParams): void {
    this.db
      .insert(chatMessages)
      .values({
        id: params.id,
        sessionId: params.sessionId,
        role: params.role,
        content: params.content,
        parts: params.parts ? JSON.stringify(params.parts) : null,
        createdAt: new Date(),
      })
      .run()
  }
}
