import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import CsvPage from "./csv-page";

const PATH = "/csv";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("csv.title"),
    description: t("csv.description"),
  });
}

export default function CsvRoute() {
  return <CsvPage />;
}
