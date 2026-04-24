import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "../../i18n/routing";
import { Providers } from "../providers";
import { COOKIE_KEYS } from "../../libs/storage-keys";
import type { Theme } from "../../libs/theme";
import { SITE_URL } from "../../libs/site";
import "../globals.css";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;

  return {
    alternates: {
      languages: {
        en: SITE_URL + "/",
        "zh-CN": SITE_URL + "/zh-CN",
        "zh-TW": SITE_URL + "/zh-TW",
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const [messages, cookieStore] = await Promise.all([getMessages(), cookies()]);
  const themeCookie = cookieStore.get(COOKIE_KEYS.theme)?.value;
  const initialTheme: Theme = themeCookie === "dark" ? "dark" : "light";

  return (
    <html lang={locale} className={initialTheme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta property="og:image" content="/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers initialTheme={initialTheme}>{children}</Providers>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
