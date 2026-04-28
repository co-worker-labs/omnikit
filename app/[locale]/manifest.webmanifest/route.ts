import { getTranslations } from "next-intl/server";
import { routing } from "../../../i18n/routing";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pwa" });
  const startUrl = locale === routing.defaultLocale ? "/" : `/${locale}`;

  const manifest = {
    name: t("name"),
    short_name: t("shortName"),
    description: t("description"),
    start_url: startUrl,
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    theme_color: "#06d6a0",
    background_color: "#f8fafc",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
