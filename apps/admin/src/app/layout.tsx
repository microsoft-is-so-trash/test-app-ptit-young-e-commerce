import type { Metadata } from 'next';
import { Providers } from '../components/providers';
import './globals.css';
export const metadata: Metadata = {
  title: 'ECOllect — Bảng vận hành',
  description: 'Bảng vận hành thu gom dầu ăn đã qua sử dụng',
  icons: { icon: '/logo.svg' },
  themeColor: '#1b6d24',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Text:wght@400;500;600;700&family=Roboto+Flex:opsz,wght@8..144,100..1000&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
