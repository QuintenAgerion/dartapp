import type { Metadata } from 'next'
import { Oswald, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'NSVV Darttoernooi',
  description: 'Beheer darttoernooien met poulefase, brackets en live scores',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={`${plusJakarta.variable} ${oswald.variable} ${plusJakarta.className}`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
