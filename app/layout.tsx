import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Gurmukhi } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MessageIcon } from "@/components/Icons";
import { Nav } from "@/components/Nav";
import { chaosLatencyMs, chaosTinyButtons } from "@/lib/flags";
import "./globals.css";

const latin = Noto_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap", weight: ["400", "700"] });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap", weight: ["400", "700"], preload: false });
const guru = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-guru", display: "swap", weight: ["400", "700"], preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("title"), description: t("description"), manifest: "/manifest.webmanifest" };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b5d1e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations();
  const [tiny, latency] = await Promise.all([chaosTinyButtons(), chaosLatencyMs()]);
  if (latency > 0) await new Promise((r) => setTimeout(r, latency)); // staging-only chaos attack
  return (
    <html lang={locale} className={`${latin.variable} ${deva.variable} ${guru.variable}`}>
      <body className={tiny ? "chaos-tiny" : undefined}>
        <a className="skip-link" href="#main">
          {t("nav.skip")}
        </a>
        <header className="site-header">
          <div className="shell">
            <div className="header-row">
              <p className="brand">{t("meta.title")}</p>
              <LanguageSwitcher />
            </div>
            <Link href="/report" className="report-btn" data-testid="report-button">
              <MessageIcon />
              {t("report.button")}
            </Link>
            <Nav
              label={t("nav.label")}
              items={[
                { href: "/", label: t("nav.today") },
                { href: "/medicines", label: t("nav.medicines") },
                { href: "/caregiver", label: t("nav.caregiver") },
                { href: "/whats-new", label: t("nav.whatsNew") },
              ]}
            />
          </div>
        </header>
        <main id="main" className="shell" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
