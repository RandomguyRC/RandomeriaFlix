import type { Metadata, Viewport } from "next";
import SessionHeartbeat from "@/components/SessionHeartbeat";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "RandomeriaFlix",
  description: "A private local-first memory streaming app.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RandomeriaFlix",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SessionHeartbeat />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
