import './globals.css'

export const metadata = {
  title: '🍎 AI Fruit Market Simulation',
  description: 'Watch 3 AI agents compete in a dynamic marketplace',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

