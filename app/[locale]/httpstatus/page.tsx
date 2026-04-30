import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import HttpStatusPage from "./httpstatus-page";

const PATH = "/httpstatus";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("httpstatus.title"),
    description: t("httpstatus.description"),
  });
}

export default function HttpStatusRoute() {
  return <HttpStatusPage />;
}
