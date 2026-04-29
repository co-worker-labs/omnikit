import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../../libs/seo";
import PrivacyPage from "./privacy-page";

const PATH = "/tnc/privacy";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("title"),
    description: t("metaDescription"),
  });
}

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
