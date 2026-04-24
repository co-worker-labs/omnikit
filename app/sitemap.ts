import { MetadataRoute } from "next";
import { routing } from "../i18n/routing";
import { SITE_URL } from "../libs/site";
import { TOOLS } from "../libs/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const { locales, defaultLocale } = routing;
  const urls: MetadataRoute.Sitemap = [];

  // Homepage for each locale
  for (const locale of locales) {
    const localePrefix = locale === defaultLocale ? "" : `/${locale}`;
    const isDefault = locale === defaultLocale;

    urls.push({
      url: `${SITE_URL}${localePrefix}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: isDefault ? 1 : 0.9,
      alternates: {
        languages: {
          en: isDefault ? SITE_URL : `${SITE_URL}/en`,
          "zh-CN": `${SITE_URL}/zh-CN`,
          "zh-TW": `${SITE_URL}/zh-TW`,
        },
      },
    });
  }

  // Tool pages for each locale
  for (const locale of locales) {
    const localePrefix = locale === defaultLocale ? "" : `/${locale}`;

    for (const tool of TOOLS) {
      urls.push({
        url: `${SITE_URL}${localePrefix}${tool.path}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
        alternates: {
          languages: {
            en: `${SITE_URL}${tool.path}`,
            "zh-CN": `${SITE_URL}/zh-CN${tool.path}`,
            "zh-TW": `${SITE_URL}/zh-TW${tool.path}`,
          },
        },
      });
    }
  }

  // Static pages
  const staticPages = ["terms", "privacy"];
  for (const locale of locales) {
    const localePrefix = locale === defaultLocale ? "" : `/${locale}`;

    for (const page of staticPages) {
      urls.push({
        url: `${SITE_URL}${localePrefix}/tnc/${page}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.3,
      });
    }
  }

  return urls;
}
