import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../../libs/seo";
import TermsPage from "./terms-page";

const PATH = "/tnc/terms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("title"),
    description: t("metaDescription"),
  });
}

export default function TermsRoute() {
  return <TermsPage />;
}
