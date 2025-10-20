// src/app/layout.js
import "./globals.css";

export const metadata = { title: "Bon Plus Thai" };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-white">
        <main className="min-h-dvh">{children}</main>
      </body>
    </html>
  );
}
