import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "LetsGraph",
  description: "기업의 돈 흐름으로 산업과 직무를 이해하는 취업 준비 서비스",
};

// Pretendard (OFL-1.1) self-hosted from the npm package; weight range per the Pretendard README for WebKit.
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-center" toastOptions={{ style: { background: "var(--color-bg-inverted)", color: "var(--color-text-inverted)", border: 0, borderRadius: "var(--radius-element)" } }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
