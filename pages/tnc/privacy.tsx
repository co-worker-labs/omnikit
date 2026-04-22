import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

import Layout from "../../components/layout";

export default function Privacy() {
  const { t } = useTranslation("privacy");

  return (
    <Layout footerPosition="none" title={t("title")}>
      <section className="container pt-3 text-break">
        <div className="text-start">
          <h1>{t("title")}</h1>
        </div>
        <div className="mt-4">
          <h3>{t("privacyStatementTitle")}</h3>
          <div>
            <p>{t("privacyStatementP1")}</p>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("personalInfoTitle")}</h3>
          <div>
            <p>{t("personalInfoP1")}</p>
            <p>{t("personalInfoP2")}</p>
            <ul>
              {(t("personalInfoList1", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t("personalInfoP3")}</p>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("personalUserInfoTitle")}</h3>
          <div>
            <p>{t("personalUserInfoP1")}</p>
            <p>{t("personalUserInfoP2")}</p>
            <p>{t("personalUserInfoP3")}</p>
            <ul>
              {(t("personalUserInfoList1", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <p>{t("personalUserInfoP4")}</p>
            <p>{t("personalUserInfoP5")}</p>
            <ul>
              {(t("personalUserInfoList2", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("sharingTitle")}</h3>
          <div>
            <p>{t("sharingP1")}</p>
            <p>{t("sharingP2")}</p>
            <p>{t("sharingP3")}</p>
            <p>{t("sharingP4")}</p>
            <p>{t("sharingP5")}</p>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("advertisingTitle")}</h3>
          <div>
            <p>{t("advertisingP1")}</p>
            <p>{t("advertisingP2")}</p>
            <ul>
              {(t("advertisingList", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <p>{t("advertisingP3")}</p>
            <p>{t("advertisingP4")}</p>
            <p>{t("advertisingP5")}</p>
            <p>
              <span className="strong">{t("advertisingNote")}</span>
            </p>
          </div>
        </div>
        <div className="mt-4">
          <h3>{t("doNotTrackTitle")}</h3>
          <div>{t("doNotTrackP1")}</div>
        </div>

        <div className="mt-4">
          <h3>{t("yourRightsTitle")}</h3>
          <div>
            <p>{t("yourRightsP1")}</p>
            <p>{t("yourRightsP2")}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3>{t("dataRetentionTitle")}</h3>
          <div>
            <p>{t("dataRetentionP1")}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3>{t("changesTitle")}</h3>
          <div>
            <p>{t("changesP1")}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3>{t("googleDriveTitle")}</h3>
          <div>
            <p>{t("googleDriveP1")}</p>
            <p>{t("googleDriveP2")}</p>
            <ul>
              {(t("googleDriveList", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t("googleDriveP3")}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3>{t("linksTitle")}</h3>
          <div>
            <p>{t("linksP1")}</p>
          </div>
        </div>

        <div className="mt-4">
          <h3>{t("contactTitle")}</h3>
          <div>
            <p>{t("contactP1")}</p>
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
      ...(await serverSideTranslations(locale, ["common", "privacy"])),
    },
  };
};
