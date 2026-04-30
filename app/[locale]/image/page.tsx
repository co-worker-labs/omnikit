import { getTranslations } from "next-intl/server";
import { generatePageMeta } from "../../../libs/seo";
import ImagePage from "./image-page";

const PATH = "/image";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMeta({
    locale,
    path: PATH,
    title: t("image.title"),
    description: t("image.description"),
  });
}

export default function ImageRoute() {
  return <ImagePage />;
}
