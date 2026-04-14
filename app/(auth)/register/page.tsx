import { Suspense } from 'react'
import { RegisterForm } from './RegisterForm'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card animate-pulse h-80" />}>
      <RegisterForm />
    </Suspense>
  )
}
