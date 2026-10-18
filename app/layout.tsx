import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cardone Capital | Investor Portal',
  description:
    'Provisional local reconstruction of the Cardone Capital Investor Portal. Synthetic demo data only — not affiliated with Cardone Capital or AppFolio.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
