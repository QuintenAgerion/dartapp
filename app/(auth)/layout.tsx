import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Image src="/NSVV logo.png" alt="NSVV" width={80} height={80} className="h-20 w-auto mx-auto mb-3" />
          <h1 className="font-display uppercase tracking-widest text-2xl text-stone-900">NSVV Darttoernooi</h1>
          <p className="text-stone-500 text-sm mt-1">Beheer je darttoernooien</p>
        </div>

        {children}
      </div>
    </div>
  )
}
