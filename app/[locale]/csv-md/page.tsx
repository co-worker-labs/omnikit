import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import CsvMdPage from "./csv-md-page";

const PATH = "/csv-md";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("csv-md.title"),
    description: t("csv-md.description"),
  });
}

export default function CsvMdRoute() {
  return <CsvMdPage />;
}
