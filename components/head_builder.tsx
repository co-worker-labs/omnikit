import Head from "next/head";
import { useTranslation } from "next-i18next/pages";

export function ToolPageHeadBuilder({ toolPath }: { toolPath: string }) {
  const { t } = useTranslation("tools");
  const key = toolPath.replace("/", "");
  return (
    <Head>
      <title>{t(`${key}.title`)}</title>
      <meta name="description" content={t(`${key}.description`)} />
      <meta name="keyword" content="" />
    </Head>
  );
}
