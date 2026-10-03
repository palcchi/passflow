import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./apple-workspace.css";
import "./editorial.css";
import "./flow.css";
import "./unified-ui.css";
import "./transitions.css";
import "./management-design.css";
import "./polish.css";
import { RouteTransition } from "@/components/route-transition";
import { AppNavigationController } from "@/components/app-navigation-controller";
import { getAppOrigin } from "@/lib/supabase/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeScript = `
(function () {
  try {
    var theme = localStorage.getItem("passflow-theme");
    if (localStorage.getItem("passflow-sidebar") === "collapsed") document.documentElement.dataset.sidebar = "collapsed";
    if (theme === "light" || theme === "dark") {
      document.documentElement.dataset.theme = theme;
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch (_) {}
})();
`;

const description =
  "PassFlow is an event platform for registration, QR tickets, digital passes, and live check-in. One account for attendees, one workspace for organizers.";

export const metadata: Metadata = {
  metadataBase: new URL(getAppOrigin() ?? "https://passflow.my.id"),
  applicationName: "PassFlow",
  title: {
    default: "PassFlow — Event registration, QR tickets & digital passes",
    template: "%s | PassFlow",
  },
  description,
  keywords: ["event registration", "QR ticket", "digital pass", "event check-in", "event management", "tiket event", "registrasi event"],
  openGraph: { type: "website", siteName: "PassFlow", locale: "en_US", description },
  twitter: { card: "summary_large_image", description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e0d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script id="passflow-theme-init" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppNavigationController />
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
