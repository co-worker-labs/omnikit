import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import RegexPage from "./regex-page";

const PATH = "/regex";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("regex.title"),
    description: t("regex.description"),
  });
}

export default function RegexRoute() {
  return <RegexPage />;
}
