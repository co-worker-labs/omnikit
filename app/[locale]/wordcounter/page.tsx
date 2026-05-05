import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import WordCounterPage from "./wordcounter-page";

const PATH = "/wordcounter";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("wordcounter.title"),
    description: t("wordcounter.description"),
  });
}

export default function WordCounterRoute() {
  return <WordCounterPage />;
}
