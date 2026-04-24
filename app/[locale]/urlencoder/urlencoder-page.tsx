"use client";

import Layout from "../../../components/layout";
import { useTranslations } from "next-intl";

export default function UrlencoderPage() {
  const t = useTranslations("tools");
  const title = t("urlencoder.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6"></div>
    </Layout>
  );
}
