import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NSVV Darttoernooi',
    short_name: 'NSVV Dart',
    description: 'Beheer darttoernooien met poulefase, brackets en live scores',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F7F5F0',
    theme_color: '#E0420C',
    icons: [
      {
        src: '/NSVV logo met bier en pijlen.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
