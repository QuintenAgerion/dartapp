export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <img src="/NSVV logo.png" alt="NSVV" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-slate-500 text-sm mt-1">Manage your darts tournaments</p>
        </div>

        {children}
      </div>
    </div>
  )
}
