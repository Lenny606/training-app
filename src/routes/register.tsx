import { createFileRoute, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { AuthForm } from '../components/auth/AuthForm'
import { register } from '../server/auth'

export const Route = createFileRoute('/register')({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: '/' })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const router = useRouter()

  async function handleSubmit(email: string, password: string) {
    await register({ data: { email, password } })
    await router.invalidate()
    await navigate({ to: '/' })
  }

  return (
    <AuthForm
      title="Create account"
      submitLabel="Create account"
      onSubmit={handleSubmit}
      passwordHint="At least 8 characters."
      footer={{ prompt: 'Already have an account?', linkLabel: 'Sign in', to: '/login' }}
    />
  )
}
