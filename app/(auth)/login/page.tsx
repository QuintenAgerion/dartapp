import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card animate-pulse h-64" />}>
      <LoginForm />
    </Suspense>
  )
}
