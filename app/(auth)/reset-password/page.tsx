import { Suspense } from 'react'
import { ResetPasswordForm } from './ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="card animate-pulse h-64" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
