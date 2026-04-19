import './globals.css'; // Adjust the path if you put the file elsewhere
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Durak Elite',
  description: 'High-Stakes Executive Card Game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}