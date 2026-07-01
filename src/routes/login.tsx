import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { AuthForm } from '../components/auth/AuthForm'
import { login } from '../server/auth'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = typeof search.redirect === 'string' ? search.redirect : undefined
    return redirect ? { redirect } : {}
  },
  beforeLoad: ({ context }) => {
    // Already signed in — skip the form.
    if (context.user) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const search = Route.useSearch()

  async function handleSubmit(email: string, password: string) {
    await login({ data: { email, password } })
    await router.invalidate()
    if (search.redirect) await navigate({ href: search.redirect })
    else await navigate({ to: '/' })
  }

  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      onSubmit={handleSubmit}
      footer={{ prompt: 'No account yet?', linkLabel: 'Create one', to: '/register' }}
    />
  )
}
