import type { Metadata } from "next";
import { Rajdhani, DM_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hockey Lines",
  description: "Build and manage hockey lines for your team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Inject before hydration to avoid flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
