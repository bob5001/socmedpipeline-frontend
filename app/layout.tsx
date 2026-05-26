import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SocMed Brief Builder',
  description: 'Build your social media content plan in minutes',
  icons: { icon: 'data:,' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-zinc-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
