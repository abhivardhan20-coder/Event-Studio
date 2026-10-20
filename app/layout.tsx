import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Gather — A little planning. A lot of magic.",
  description:
    "Your thoughtful celebration companion. Plan weddings, birthdays and community events with Gemini-powered ideas, budgets, timelines and vendor checklists.",
  icons: { icon: "/favicon.svg" },
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
