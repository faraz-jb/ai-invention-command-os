import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Invention — Command OS",
  description: "Control dashboard for AI Invention agents, projects, and sites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen antialiased">{children}</body>
    </html>
  );
}
