import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SuppressDevToolsWarning } from "./components/SuppressDevToolsWarning";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weight Tracker",
  description: "Track your weight loss journey",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SuppressDevToolsWarning />
        {children}
      </body>
    </html>
  );
}
