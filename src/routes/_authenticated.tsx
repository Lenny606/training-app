import { createFileRoute, redirect } from '@tanstack/react-router'

// Pathless layout that gates every nested route. `beforeLoad` runs after the
// root's, so `context.user` is already resolved. This is UX/navigation only —
// the data boundary is enforced by `requireAuth` on each server function.
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
})
