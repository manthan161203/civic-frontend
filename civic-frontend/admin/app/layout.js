import "./globals.css";
import Providers from '../src/lib/providers';

export const metadata = {
  title: "Civic Admin",
  description: "Civic Issue Management Admin Panel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
