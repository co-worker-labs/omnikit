import type { Metadata } from "next";
import { SITE_URL } from "./site";
import { routing } from "../i18n/routing";

type GenerateMetaOptions = {
  locale: string;
  path: string;
  title?: string;
  description: string;
};

const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
};

export function generatePageMeta({
  locale,
  path,
  title,
  description,
}: GenerateMetaOptions): Metadata {
  const { defaultLocale, locales } = routing;

  const languages: Record<string, string> = {
    "x-default": `${SITE_URL}${path}`,
  };
  for (const loc of locales) {
    const prefix = loc === defaultLocale ? "" : `/${loc}`;
    languages[loc] = `${SITE_URL}${prefix}${path}`;
  }

  const localePrefix = locale === defaultLocale ? "" : `/${locale}`;
  const canonicalUrl = `${SITE_URL}${localePrefix}${path}`;

  const result: Metadata = {
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "OmniKit",
      locale: OG_LOCALES[locale] || "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
    },
  };

  if (title) {
    result.title = title;
  }

  return result;
}
