import { getTranslations } from "next-intl/server";
import JsonPage from "./json-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("json.title"),
    description: t("json.description"),
    keywords: "",
  };
}

export default function JsonRoute() {
  return <JsonPage />;
}
