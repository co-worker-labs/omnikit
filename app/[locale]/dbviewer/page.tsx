import { getTranslations } from "next-intl/server";
import DbViewerPage from "./dbviewer-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("dbviewer.title"),
    description: t("dbviewer.description"),
    keywords: "",
  };
}

export default function DbViewerRoute() {
  return <DbViewerPage />;
}
