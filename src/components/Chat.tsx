import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import {
  Send,
  Square,
  Bot,
  User,
  Wrench,
  Check,
  X,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { MODELS, DEFAULT_MODEL, type ModelId } from '../ai/models'

// ---------------------------------------------------------------------------
// Session ID helpers — one stable ID per model, persisted in localStorage.
// Resetting clears the current ID so a fresh session is started next turn.
// ---------------------------------------------------------------------------

function getStoredSessionId(model: ModelId): string {
  const key = `chat_session_${model}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function clearStoredSessionId(model: ModelId): string {
  const key = `chat_session_${model}`
  const newId = crypto.randomUUID()
  localStorage.setItem(key, newId)
  return newId
}

// Selected model survives a refresh too — otherwise a reload silently flips
// back to the default model and shows a different conversation.
const MODEL_STORAGE_KEY = 'chat_model'

function getStoredModel(): ModelId {
  const stored = localStorage.getItem(MODEL_STORAGE_KEY)
  return MODELS.some((m) => m.id === stored)
    ? (stored as ModelId)
    : DEFAULT_MODEL
}

// ---------------------------------------------------------------------------
// Root component — model selection, conversation list, active session
// ---------------------------------------------------------------------------

interface SessionSummary {
  id: string
  modelId: string
  updatedAt: string
  title: string | null
}

export default function Chat() {
  const [model, setModel] = useState<ModelId>(getStoredModel)
  const [sessionId, setSessionId] = useState<string>(() =>
    getStoredSessionId(getStoredModel()),
  )
  const [sessions, setSessions] = useState<SessionSummary[]>([])

  const refreshSessions = useCallback(() => {
    fetch('/api/chat/sessions')
      .then((r) => r.json())
      .then((data: { sessions: SessionSummary[] }) =>
        setSessions(data.sessions),
      )
      .catch(() => {
        // Non-critical — the sidebar just stays as-is
      })
  }, [])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const handleModelChange = (next: ModelId) => {
    localStorage.setItem(MODEL_STORAGE_KEY, next)
    setModel(next)
    setSessionId(getStoredSessionId(next))
  }

  const handleSelect = (session: SessionSummary) => {
    // Adopt as the active session for its model — both survive a refresh.
    const modelId = MODELS.some((m) => m.id === session.modelId)
      ? (session.modelId as ModelId)
      : DEFAULT_MODEL
    localStorage.setItem(`chat_session_${modelId}`, session.id)
    localStorage.setItem(MODEL_STORAGE_KEY, modelId)
    setModel(modelId)
    setSessionId(session.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' })
    } catch {
      return
    }
    if (id === sessionId) {
      setSessionId(clearStoredSessionId(model))
    }
    refreshSessions()
  }

  const handleReset = useCallback(() => {
    setSessionId(clearStoredSessionId(model))
  }, [model])

  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-semibold text-ink-soft">
            Model
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value as ModelId)}
              className="ml-2 rounded-lg border border-line bg-chip px-2 py-1 text-xs font-semibold text-ink"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <span className="text-2xs uppercase tracking-wide text-ink-soft">
            each model keeps its own conversation
          </span>
        </div>

        {/* key=sessionId so ChatSession remounts (and rehydrates) on switch */}
        <ChatSession
          key={sessionId}
          model={model}
          sessionId={sessionId}
          onReset={handleReset}
          onTurnComplete={refreshSessions}
        />
      </div>

      <ConversationList
        sessions={sessions}
        activeId={sessionId}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConversationList — desktop-only sidebar with delete per row
// ---------------------------------------------------------------------------

function ConversationList({
  sessions,
  activeId,
  onSelect,
  onDelete,
}: {
  sessions: SessionSummary[]
  activeId: string
  onSelect: (session: SessionSummary) => void
  onDelete: (id: string) => void
}) {
  const modelLabel = (id: string) =>
    MODELS.find((m) => m.id === id)?.label ?? id

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-2 rounded-2xl border border-line bg-chip p-3 lg:flex">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Conversations
      </h2>
      {sessions.length === 0 && (
        <p className="px-1 text-xs text-ink-soft">No conversations yet.</p>
      )}
      <ul className="flex flex-col gap-1">
        {sessions.map((session) => (
          <li
            key={session.id}
            className={`group flex items-center gap-1 rounded-xl border px-2 py-1.5 ${
              session.id === activeId
                ? 'border-lagoon bg-header'
                : 'border-transparent hover:bg-header'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(session)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-xs text-ink">
                {session.title ?? 'New conversation'}
              </span>
              <span className="block text-2xs text-ink-soft">
                {modelLabel(session.modelId)} ·{' '}
                {new Date(session.updatedAt).toLocaleDateString()}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(session.id)}
              title="Delete conversation"
              aria-label={`Delete conversation ${session.title ?? ''}`.trim()}
              className="shrink-0 rounded-lg p-1.5 text-ink-soft opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// ChatSession — the main conversation component for a given model
// ---------------------------------------------------------------------------

function ChatSession({
  model,
  sessionId,
  onReset,
  onTurnComplete,
}: {
  model: ModelId
  sessionId: string
  onReset: () => void
  onTurnComplete: () => void
}) {
  const [input, setInput] = useState('')
  const [isHydrating, setIsHydrating] = useState(true)
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef<Set<string>>(new Set())

  const {
    messages,
    setMessages,
    sendMessage,
    stop,
    isLoading,
    error,
    status,
    addToolApprovalResponse,
  } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
    // `forwardedProps` (canonical; `body` is a deprecated alias) lands in the
    // POST payload under `forwardedProps` — the server reads it from there.
    forwardedProps: { model, sessionId },
  })

  // -------------------------------------------------------------------------
  // Hydrate: on first mount load stored messages from the server
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    setIsHydrating(true)

    fetch(`/api/chat?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data: { messages: UIMessage[] }) => {
        if (!cancelled && data.messages.length > 0) {
          // Restored tool calls must not re-trigger the start_workout
          // deep-link below — mark them as already handled.
          for (const message of data.messages) {
            for (const part of message.parts) {
              if (part.type === 'tool-call') startedRef.current.add(part.id)
            }
          }
          setMessages(data.messages)
        }
      })
      .catch(() => {
        // Non-critical — continue with empty history if fetch fails
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId, setMessages])

  // -------------------------------------------------------------------------
  // Deep-link: navigate to timer when start_workout completes
  // -------------------------------------------------------------------------
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === 'tool-call' &&
          part.name === 'start_workout' &&
          part.state === 'complete' &&
          part.output?.ok &&
          !startedRef.current.has(part.id)
        ) {
          startedRef.current.add(part.id)
          navigate({ to: '/', search: { plan: part.output.planId } })
        }
      }
    }
  }, [messages, navigate])

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  // Refresh the conversation sidebar when a turn finishes (new session rows
  // and updated titles/timestamps come from the server).
  const wasLoadingRef = useRef(false)
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) onTurnComplete()
    wasLoadingRef.current = isLoading
  }, [isLoading, onTurnComplete])

  const handleSubmit = () => {
    const text = input.trim()
    // Block sends until hydration finishes — a message sent mid-hydration
    // would be clobbered when setMessages applies the stored history.
    if (!text || isLoading || isHydrating) return
    sendMessage(text)
    setInput('')
  }

  // Parent swaps sessionId, which remounts this component with clean state.
  const handleReset = onReset

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-chip">
      <div
        ref={scrollRef}
        className="flex min-h-50vh flex-col gap-4 overflow-y-auto p-4"
        aria-live="polite"
      >
        {isHydrating && (
          <div className="m-auto text-xs text-ink-soft animate-pulse">
            Loading conversation…
          </div>
        )}
        {!isHydrating && messages.length === 0 && <EmptyState />}
        {messages.map((message) => (
          <MessageRow
            key={message.id}
            message={message}
            onApprove={addToolApprovalResponse}
          />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="text-xs text-ink-soft">Thinking…</div>
        )}
      </div>

      {error && (
        <div className="border-t border-line px-4 py-2 text-xs text-danger">
          {error.message}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          rows={1}
          placeholder={
            'Ask about your plans, or say \u201cstart my push day\u201d\u2026'
          }
          className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-header px-3 py-2.5 text-sm text-ink outline-none focus:border-lagoon"
        />
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          title="Start new conversation"
          className="demo-button demo-button-icon min-h-11 min-w-11 text-ink-soft disabled:opacity-40"
          aria-label="New conversation"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="demo-button demo-button-icon min-h-11 min-w-11"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isHydrating}
            className="demo-button demo-button-icon min-h-11 min-w-11 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>

      <span className="sr-only" role="status">
        {status}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="m-auto max-w-sm text-center text-sm text-ink-soft">
      <Bot className="mx-auto mb-2 h-6 w-6 text-lagoon" />
      <p className="font-semibold text-ink">Your training assistant</p>
      <p className="mt-1">
        Try "list my plans", "summarize my push day", "add a 90s plank to my
        HIIT plan", or "start my deadlift session".
      </p>
    </div>
  )
}

function MessageRow({
  message,
  onApprove,
}: {
  message: UIMessage
  onApprove: (r: { id: string; approved: boolean }) => void
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-header">
        {isUser ? (
          <User className="h-3.5 w-3.5 text-ink-soft" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-lagoon" />
        )}
      </div>
      <div
        className={`flex max-w-85pct flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
      >
        {message.parts.map((part, i) => (
          <MessagePart key={i} part={part} onApprove={onApprove} />
        ))}
      </div>
    </div>
  )
}

function MessagePart({
  part,
  onApprove,
}: {
  part: UIMessage['parts'][number]
  onApprove: (r: { id: string; approved: boolean }) => void
}) {
  if (part.type === 'text' && part.content) {
    return (
      <div className="whitespace-pre-wrap rounded-xl border border-line bg-header px-3 py-2 text-sm text-ink">
        {part.content}
      </div>
    )
  }

  if (part.type === 'thinking' && part.content) {
    return (
      <details className="w-full text-xs text-ink-soft">
        <summary className="cursor-pointer select-none">
          Thought process
        </summary>
        <pre className="mt-1 whitespace-pre-wrap font-sans">{part.content}</pre>
      </details>
    )
  }

  if (part.type === 'tool-call') {
    const needsApproval = part.state === 'approval-requested' && part.approval
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5 font-semibold">
          <Wrench className="h-3 w-3" />
          {toolLabel(part.name, part.state)}
        </span>
        {needsApproval && (
          <div className="flex flex-col gap-2">
            <pre className="whitespace-pre-wrap rounded bg-header px-2 py-1 text-xxs">
              {part.arguments}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  onApprove({ id: part.approval!.id, approved: true })
                }
                className="demo-button demo-button-sm inline-flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Approve
              </button>
              <button
                type="button"
                onClick={() =>
                  onApprove({ id: part.approval!.id, approved: false })
                }
                className="demo-button demo-button-sm inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Deny
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

function toolLabel(name: string, state: string): string {
  if (state === 'approval-requested') return `${name} needs approval`
  if (state === 'complete') return `ran ${name}`
  if (state === 'error') return `${name} failed`
  return `running ${name}…`
}
