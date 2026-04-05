import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mumaa - Connect with Trusted Nannies via Video Call",
  description:
    "Mumaa connects parents with experienced, verified nannies for instant and scheduled video calls. Get expert childcare guidance from the comfort of your home.",
  keywords: [
    "Mumaa",
    "nanny video call",
    "childcare",
    "parenting",
    "babysitter",
    "video consultation",
  ],
  authors: [{ name: "Mumaa Team" }],
  openGraph: {
    title: "Mumaa - Connect with Trusted Nannies via Video Call",
    description:
      "Mumaa connects parents with experienced, verified nannies for instant and scheduled video calls.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mumaa - Connect with Trusted Nannies via Video Call",
    description:
      "Mumaa connects parents with experienced, verified nannies for instant and scheduled video calls.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
