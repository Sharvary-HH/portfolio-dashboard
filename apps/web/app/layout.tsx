import type { Metadata } from 'next';
import { Amethysta, Prompt } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';

const prompt = Prompt({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-prompt',
});

const amethysta = Amethysta({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-amethysta',
});

export const metadata: Metadata = {
  title: 'Portfolio dashboard',
  description: 'Live NSE and BSE holdings with sector totals, P/E and latest earnings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${prompt.variable} ${amethysta.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
