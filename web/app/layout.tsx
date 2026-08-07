import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Host Chat",
  description: "Chat with the MCP-powered agent",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}