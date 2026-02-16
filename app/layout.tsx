import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dividamos - Split Expenses",
  description: "Track shared expenses and settle debts with friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
