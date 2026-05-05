import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import DeduplinesPage from "./deduplines-page";

const PATH = "/deduplines";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("deduplines.title"),
    description: t("deduplines.description"),
  });
}

export default function DeduplinesRoute() {
  return <DeduplinesPage />;
}
