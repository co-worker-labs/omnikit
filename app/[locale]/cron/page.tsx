import { getTranslations } from "next-intl/server";
import CronPage from "./cron-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return {
    title: t("cron.title"),
    description: t("cron.description"),
    keywords: "",
  };
}

export default function CronRoute() {
  return <CronPage />;
}
