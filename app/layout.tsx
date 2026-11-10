import type { Metadata } from 'next';
import './tokens.css'; // WA-designsystemet, kopiert uendret fra nettsiden (wask_website_2_0)
import './globals.css';

export const metadata: Metadata = {
  title: 'Helsepolitisk radar · Wergeland Apenes',
  description: 'Oversikt over helse- og omsorgskomiteen, spørsmål, høringer, saker og regjeringen',
  robots: { index: false, follow: false },
  icons: { icon: '/wa-mark.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
