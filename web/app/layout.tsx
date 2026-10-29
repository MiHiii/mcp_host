import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Host Chat",
  description: "Chat interface for MCP Host Agent",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}