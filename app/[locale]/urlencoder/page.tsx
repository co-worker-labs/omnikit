import { getTranslations } from "next-intl/server";
import UrlencoderPage from "./urlencoder-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("urlencoder.title"),
    description: t("urlencoder.description"),
    keywords: "",
  };
}

export default function UrlencoderRoute() {
  return <UrlencoderPage />;
}
