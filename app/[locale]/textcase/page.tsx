import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import TextCasePage from "./textcase-page";

const PATH = "/textcase";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("textcase.title"),
    description: t("textcase.description"),
  });
}

export default function TextCaseRoute() {
  return <TextCasePage />;
}
