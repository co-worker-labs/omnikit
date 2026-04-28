import { getTranslations } from "next-intl/server";
import UnixtimePage from "./unixtime-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("unixtime.title"),
    description: t("unixtime.description"),
    keywords: "",
  };
}

export default function UnixtimeRoute() {
  return <UnixtimePage />;
}
