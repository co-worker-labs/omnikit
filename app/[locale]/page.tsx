import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../libs/seo";
import HomePage from "./home-page";

const PATH = "";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("title"),
    description: t("metaDescription"),
  });
}

export default function HomeRoute() {
  return <HomePage />;
}
