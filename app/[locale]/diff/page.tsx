import { getTranslations } from "next-intl/server";
import DiffPage from "./diff-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("diff.title"),
    description: t("diff.description"),
    keywords: "",
  };
}

export default function DiffRoute() {
  return <DiffPage />;
}
