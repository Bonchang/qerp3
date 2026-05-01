import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'QERP Dashboard',
  description: 'Production-style trading dashboard for portfolio monitoring, quotes, charts, and paper order flow.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
