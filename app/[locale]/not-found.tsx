"use client";

import { Link } from "../../i18n/navigation";
import { useTranslations } from "next-intl";
import Layout from "../../components/layout";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <h1 className="text-6xl font-bold text-fg-muted">404</h1>
        <p className="text-lg text-fg-secondary">{t("notFound.message")}</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-accent-cyan px-6 py-2 text-sm font-semibold text-bg-base hover:bg-accent-cyan/90 transition-colors"
        >
          {t("notFound.backHome")}
        </Link>
      </div>
    </Layout>
  );
}
