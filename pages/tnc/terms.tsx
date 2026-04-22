import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

import Layout from "../../components/layout";

export default function Terms() {
  const { t } = useTranslation("terms");

  return (
    <Layout footerPosition="none" title={t("title")}>
      <section className="container pt-3">
        <div className="text-start">
          <h1>{t("title")}</h1>
        </div>
        <div className="mt-4">
          <h3>{t("overviewTitle")}</h3>
          <div>
            <p>{t("overviewP1")}</p>
            <p>{t("overviewP2")}</p>
            <p>{t("overviewP3")}</p>
            <p>{t("overviewP4")}</p>
            <p>{t("overviewP5")}</p>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("siteUsageTitle")}</h3>
          <div>
            <p>{t("siteUsageP1")}</p>
            <p>{t("siteUsageP2")}</p>
            <p>{t("siteUsageP3")}</p>
            <p>{t("siteUsageP4")}</p>
            <p>{t("siteUsageP5")}</p>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("generalConditionsTitle")}</h3>
          <div>
            <p>{t("generalConditionsP1")}</p>
            <p>{t("generalConditionsP2")}</p>
            <p>{t("generalConditionsP3")}</p>
            <p>{t("generalConditionsP4")}</p>
            <p>{t("generalConditionsP5")}</p>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("fairUseTitle")}</h3>
          <div>
            <p>{t("fairUseP1")}</p>
            <p>{t("fairUseP2")}</p>
            <ul>
              {(t("fairUseList1", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <p>{t("fairUseP3")}</p>
            <ul>
              {(t("fairUseList2", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "terms"])),
    },
  };
};
