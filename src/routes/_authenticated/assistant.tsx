import { createFileRoute } from '@tanstack/react-router'
import Chat from '../../components/Chat'

export const Route = createFileRoute('/_authenticated/assistant')({
  // Client-only: Chat reads localStorage (session + model) during render,
  // which would throw on the server. The page is behind auth — no SEO value.
  ssr: false,
  component: AssistantPage,
})

function AssistantPage() {
  return (
    <main className="page-wrap px-4 py-6 sm:py-10 max-w-2xl mx-auto flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Assistant</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage your plans and start workouts in plain language. It only ever
          sees your own plans.
        </p>
      </div>
      <Chat />
    </main>
  )
}
