import { Suspense } from 'react'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="card animate-pulse h-64" />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
