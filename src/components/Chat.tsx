import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import { Send, Square, Bot, User, Wrench, Check, X, RotateCcw } from 'lucide-react'
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

// ---------------------------------------------------------------------------
// Root component — handles model selection and mounts per-model sessions
// ---------------------------------------------------------------------------

export default function Chat() {
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL)

  const handleModelChange = (next: ModelId) => {
    setModel(next)
  }

  return (
    <div className="flex flex-col gap-4">
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
        <span className="text-[10px] uppercase tracking-wide text-ink-soft">
          switching model starts a new chat
        </span>
      </div>

      {/* key=model so ChatSession remounts when model changes */}
      <ChatSession key={model} model={model} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChatSession — the main conversation component for a given model
// ---------------------------------------------------------------------------

function ChatSession({ model }: { model: ModelId }) {
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string>(() =>
    getStoredSessionId(model),
  )
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
    body: { model, sessionId },
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

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage(text)
    setInput('')
  }

  const handleReset = useCallback(() => {
    const next = clearStoredSessionId(model)
    setSessionId(next)
    setMessages([])
    setInput('')
  }, [model, setMessages])

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-chip">
      <div
        ref={scrollRef}
        className="flex min-h-[50vh] flex-col gap-4 overflow-y-auto p-4"
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
          placeholder={'Ask about your plans, or say \u201cstart my push day\u201d\u2026'}
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
            disabled={!input.trim()}
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
        className={`flex max-w-[85%] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
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
            <pre className="whitespace-pre-wrap rounded bg-header px-2 py-1 text-[11px]">
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
