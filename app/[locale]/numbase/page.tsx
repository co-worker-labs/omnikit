import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import NumbasePage from "./numbase-page";

const PATH = "/numbase";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("numbase.title"),
    description: t("numbase.description"),
  });
}

export default function NumbaseRoute() {
  return <NumbasePage />;
}
