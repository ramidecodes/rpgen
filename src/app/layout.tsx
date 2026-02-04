import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Nanum_Myeongjo, Cinzel_Decorative } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const nanumMyeongjo = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-nanum-myeongjo",
  display: "swap",
});

const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-cinzel-decorative",
  display: "swap",
});

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://rpgen.ramilabs.com";

export const metadata: Metadata = {
  title: "RPGen",
  description: "AI-driven RPG campaign with procedurally generated worlds",
  keywords: [
    "RPG",
    "role playing game",
    "AI game",
    "text adventure",
    "D&D",
    "procedural generation",
    "game master",
    "interactive fiction",
  ],
  authors: [{ name: "Rami Labs" }],
  creator: "Rami Labs",
  publisher: "Rami Labs",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RPGen",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "RPGen",
    title: "RPGen — Infinite Worlds, Boundless Choices",
    description:
      "AI-driven RPG campaign with procedurally generated worlds. Step into a world shaped by your decisions.",
    images: [
      {
        url: `${baseUrl}/favicon-96x96.png`,
        width: 96,
        height: 96,
        alt: "RPGen",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "RPGen — Infinite Worlds, Boundless Choices",
    description:
      "AI-driven RPG campaign with procedurally generated worlds. Step into a world shaped by your decisions.",
    images: [`${baseUrl}/favicon-96x96.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={cn(nanumMyeongjo.variable, cinzelDecorative.variable)}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <CookieBanner />
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
