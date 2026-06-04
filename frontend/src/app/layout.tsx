import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ToastContainer from '../components/ToastContainer';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '360° AI Gelişim Planı | Performans Analiz Sistemi',
  description: '360 derece değerlendirme sonuçlarına dayalı yapay zeka destekli kişisel gelişim planlama ve görev takip sistemi.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground selection:bg-primary selection:text-white">
        <ToastContainer />
        {children}
      </body>
    </html>
  );
}
