import Head from "next/head";
import styles from "../styles/Home.module.css";
import Layout from "../components/layout";
import { listMatchedTools, ToolData } from "../libs/tools";
import { useRouter } from "next/router";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { getTranslatedTools } from "../libs/tools";

function Introduce() {
  const { t } = useTranslation("home");
  return (
    <div className={`${styles.introduce}`}>
      <div className="container text-center">
        <span className={`h1 text-capitalize fw-bolder ${styles.introduceTitle}`}>
          {t("exploreTitle")}
        </span>
      </div>
    </div>
  );
}

function ToolCollection() {
  const router = useRouter();
  const { t } = useTranslation(["common", "tools"]);
  const data = getTranslatedTools(t);

  return (
    <div className="container text-center px-3 mb-5">
      <div className="row mt-5">
        <>
          {data.map((value, index) => {
            return (
              <div className="col-12 col-md-6 col-lg-3 px-2 py-2" key={index}>
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title fw-bold">{value.title}</h5>
                    <p
                      className="card-text text-truncate text-wrap text-muted"
                      style={{ height: "2.8rem" }}
                    >
                      {value.description}
                    </p>
                    <div className="d-flex justify-content-center">
                      <button
                        type="button"
                        className="btn btn-outline-success col-8"
                        disabled={value.path == ""}
                        onClick={() => {
                          router.push(value.path);
                        }}
                      >
                        {value.path == "" ? t("common:common.comingSoon") : t("common:common.goto")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      </div>
    </div>
  );
}

export default function Home({ tools }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation(["home", "tools"]);
  const keywords: string[] = [];
  tools.forEach((value: ToolData) => {
    value.keywords.forEach((kw) => {
      if (!keywords.includes(kw)) {
        keywords.push(kw);
      }
    });
  });
  return (
    <>
      <Head>
        <title>{t("home:title")}</title>
        <meta name="description" content={t("home:metaDescription")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keyword" content={keywords.join(",")} />
      </Head>
      <Layout headerPosition="none" aside={false}>
        <Introduce />
        <ToolCollection />
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  const tools: ToolData[] = listMatchedTools("");
  return {
    props: {
      tools,
      ...(await serverSideTranslations(locale, ["common", "home", "tools"])),
    },
  };
};
