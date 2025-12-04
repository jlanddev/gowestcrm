import './globals.css'

export const metadata = {
  title: 'GoWest CRM - Internal Dashboard',
  description: 'GoWest Lands internal CRM and lead management system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body">{children}</body>
    </html>
  )
}
