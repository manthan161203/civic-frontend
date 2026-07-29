import { Inter, IBM_Plex_Mono } from 'next/font/google';
import "./globals.css";
import Providers from '../src/lib/providers';

/*
 * The console rendered in `Arial, Helvetica, sans-serif` — a `body` rule in
 * globals.css that overrode everything. That one line was most of why the app
 * looked like an unstyled template regardless of what else was done to it.
 *
 * `variable` (rather than `className`) so the font feeds `--font-sans` in the
 * @theme block, which is what makes every Tailwind text utility inherit it.
 *
 * Note for offline builds: next/font/google self-hosts at build time by
 * fetching the font files, so a build machine with no network fails here. If
 * that becomes a constraint, swap to next/font/local with the woff2 committed
 * under public/ — the rest of this file is unchanged either way.
 */
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app',
});

/*
 * A monospace for identifiers and timestamps. In a triage table the eye is
 * matching shapes down a column, not reading words, and proportional glyphs
 * make that measurably harder.
 */
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-app-mono',
});

export const metadata = {
  title: "Civic Admin",
  description: "Civic Issue Management Admin Panel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${sans.variable} ${mono.variable}`}>
      <body className="h-full bg-canvas text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
