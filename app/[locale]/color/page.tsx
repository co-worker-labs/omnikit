import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import ColorPage from "./color-page";

const PATH = "/color";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("color.title"),
    description: t("color.description"),
  });
}

export default function ColorRoute() {
  return <ColorPage />;
}
