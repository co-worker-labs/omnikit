import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import {
  getLetters,
  CharacterData,
  getPunctuations,
  getCurrencies,
  getMathematical,
  getDiacritics,
  getAscii,
  getIcons,
  getPronunciations,
  PronunciationCharacterData,
} from "../libs/htmlcode";
import { findTool, ToolData } from "../libs/tools";
import styles from "../styles/HtmlCode.module.css";

function printEntityName(code: string | undefined) {
  if (code && code.startsWith("&")) {
    return <code>{code}</code>;
  } else {
    return code;
  }
}

function PronunciationPrinter({
  desc,
  list,
}: {
  list: PronunciationCharacterData[];
  desc: string;
}) {
  const { t } = useTranslation("htmlcode");
  return (
    <div className={`${styles.character}`} style={{ top: "3rem" }}>
      <p>{desc}</p>
      <table className="table text-center table-striped table-hover table-bordered">
        <thead className="table-dark sticky-top">
          <tr className="text-uppercase">
            <th scope="col">{t("tableHeaders.character")}</th>
            <th scope="col">{t("tableHeaders.entityName")}</th>
            <th scope="col">{t("tableHeaders.entityCode")}</th>
            <th scope="col">{t("tableHeaders.ipa")}</th>
            <th scope="col">{t("tableHeaders.ipaEntityName")}</th>
            <th scope="col">{t("tableHeaders.ipaEntityCode")}</th>
            <th scope="col">{t("tableHeaders.example")}</th>
          </tr>
        </thead>
        <tbody className="table-group-divider">
          {list.map((data, index) => {
            return (
              <tr key={index}>
                <td>
                  <span dangerouslySetInnerHTML={{ __html: data.code }}></span>
                </td>
                <td>{printEntityName(data.entityName)}</td>
                <td>{data.code}</td>
                <td>
                  {data.ipaCode ? (
                    <span dangerouslySetInnerHTML={{ __html: data.ipaCode }}></span>
                  ) : (
                    <></>
                  )}
                </td>
                <td>{printEntityName(data.ipaEntityName)}</td>
                <td>{data.ipaCode || ""}</td>
                <td>
                  <span dangerouslySetInnerHTML={{ __html: data.example }}></span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CharacterPrinter({ desc, list }: { list: CharacterData[]; desc: string }) {
  const { t } = useTranslation("htmlcode");
  return (
    <div className={`${styles.character}`}>
      <p>{desc}</p>
      <table className="table text-center table-striped table-hover table-bordered">
        <thead className="table-dark sticky-top" style={{ top: "3rem" }}>
          <tr className="text-uppercase">
            <th scope="col">{t("tableHeaders.character")}</th>
            <th scope="col">{t("tableHeaders.entityName")}</th>
            <th scope="col">{t("tableHeaders.entityNumber")}</th>
            <th scope="col">{t("tableHeaders.hexCode")}</th>
            <th scope="col">{t("tableHeaders.description")}</th>
          </tr>
        </thead>
        <tbody className="table-group-divider">
          {list.map((data, index) => {
            return (
              <tr key={index}>
                <td>
                  <span dangerouslySetInnerHTML={{ __html: "&#" + data.entityNumber + ";" }}></span>
                </td>
                <td>{printEntityName(data.entityName)}</td>
                <td>{"&#" + data.entityNumber + ";"}</td>
                <td>{"&#x" + data.entityNumber.toString(16).toUpperCase() + ";"}</td>
                <td>{data.description}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PrintLetters({ list }: { list: CharacterData[] }) {
  const { t } = useTranslation("htmlcode");
  const letters = [];
  for (var i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
    letters.push(i);
  }

  return (
    <>
      <div className="card my-2">
        <div className="row card-body">
          {letters.map((code) => {
            const chr = String.fromCharCode(code);
            return (
              <a
                key={"letters-goto-" + chr}
                className="btn btn-light col-auto m-1"
                href={"#letters-" + chr}
              >
                {chr}
              </a>
            );
          })}
        </div>
      </div>
      <table className="table text-center table-striped table-hover table-bordered">
        <thead className="table-dark sticky-top" style={{ top: "3rem" }}>
          <tr className="text-uppercase">
            <th scope="col">{t("tableHeaders.character")}</th>
            <th scope="col">{t("tableHeaders.entityName")}</th>
            <th scope="col">{t("tableHeaders.entityNumber")}</th>
            <th scope="col">{t("tableHeaders.hexCode")}</th>
            <th scope="col">{t("tableHeaders.description")}</th>
          </tr>
        </thead>
        <tbody className="table-group-divider">
          {list.map((data, index) => {
            const chr = String.fromCharCode(data.entityNumber);
            return (
              <tr key={index} id={chr >= "A" && chr <= "Z" ? "letters-" + chr : undefined}>
                <td>{chr}</td>
                <td>{printEntityName(data.entityName)}</td>
                <td>{"&#" + data.entityNumber + ";"}</td>
                <td>{"&#x" + data.entityNumber.toString(16).toUpperCase() + ";"}</td>
                <td>{data.description}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function Description() {
  const { t } = useTranslation("htmlcode");
  return (
    <section id="description" className={`mt-3 text-break ${styles.description}`}>
      <p>{t("description.p1")}</p>
      <p>{t("description.p2")}</p>
      <div className="row justify-content-start">
        <pre className="border col-auto rounded py-2 px-5 ms-md-4">
          &lt;meta charset=&quot;utf-8&quot; &gt;
        </pre>
      </div>
    </section>
  );
}

function HtmlCodePage({
  toolData,
  letters,
  punctuations,
  currencies,
  mathematical,
  diacritics,
  ascii,
  icons,
  pronunciations,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation("htmlcode");
  return (
    <>
      <ToolPageHeadBuilder toolPath="/htmlcode" />
      <Layout title={toolData.title}>
        <div className="container py-4">
          <Description />
          <section>
            <ul className="nav nav-tabs" id="myTab" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link active fw-bold"
                  id="letters-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#letters-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="letters-tab-pane"
                  aria-selected="true"
                >
                  {t("tabs.letters")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="Punctuation-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#Punctuation-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="Punctuation-tab-pane"
                  aria-selected="false"
                >
                  {t("tabs.punctuation")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="currencies-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#currencies-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="currencies-tab-pane"
                  aria-selected="false"
                >
                  {t("tabs.currencies")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="mathematical-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#mathematical-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="mathematical-tab-pane"
                  aria-selected="false"
                >
                  {t("tabs.mathematical")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="pronunciations-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#pronunciations-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="pronunciations-tab-pane"
                  aria-selected="false"
                >
                  {t("tabs.pronunciations")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="diacritics-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#diacritics-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="diacritics-tab-pane"
                  aria-selected="false"
                >
                  {t("tabs.diacritics")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="ascii-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#ascii-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="ascii-tab-pane"
                  aria-selected="false"
                >
                  {t("tabs.ascii")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="icons-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#icons-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="icons-tab-pane"
                  aria-selected="false"
                >
                  {t("tabs.icons")}
                </button>
              </li>
            </ul>
            <div className="tab-content mt-2" id="myTabContent">
              <div
                className="tab-pane fade show active"
                id="letters-tab-pane"
                role="tabpanel"
                aria-labelledby="letters-tab"
                tabIndex={0}
              >
                <PrintLetters list={letters} />
              </div>
              <div
                className="tab-pane fade"
                id="Punctuation-tab-pane"
                role="tabpanel"
                aria-labelledby="Punctuation-tab"
                tabIndex={1}
              >
                <CharacterPrinter desc={t("tabDescriptions.punctuation")} list={punctuations} />
              </div>
              <div
                className="tab-pane fade"
                id="currencies-tab-pane"
                role="tabpanel"
                aria-labelledby="currencies-tab"
                tabIndex={2}
              >
                <CharacterPrinter desc={t("tabDescriptions.currencies")} list={currencies} />
              </div>
              <div
                className="tab-pane fade"
                id="mathematical-tab-pane"
                role="tabpanel"
                aria-labelledby="mathematical-tab"
                tabIndex={3}
              >
                <CharacterPrinter desc={t("tabDescriptions.mathematical")} list={mathematical} />
              </div>
              <div
                className="tab-pane fade"
                id="pronunciations-tab-pane"
                role="tabpanel"
                aria-labelledby="pronunciations-tab"
                tabIndex={4}
              >
                <PronunciationPrinter
                  desc={t("tabDescriptions.pronunciations")}
                  list={pronunciations}
                />
              </div>
              <div
                className="tab-pane fade"
                id="diacritics-tab-pane"
                role="tabpanel"
                aria-labelledby="diacritics-tab"
                tabIndex={5}
              >
                <CharacterPrinter desc={t("tabDescriptions.diacritics")} list={diacritics} />
              </div>
              <div
                className="tab-pane fade"
                id="ascii-tab-pane"
                role="tabpanel"
                aria-labelledby="ascii-tab"
                tabIndex={6}
              >
                <CharacterPrinter desc={t("tabDescriptions.ascii")} list={ascii} />
              </div>
              <div
                className="tab-pane fade"
                id="icons-tab-pane"
                role="tabpanel"
                aria-labelledby="icons-tab"
                tabIndex={7}
              >
                <CharacterPrinter desc={t("tabDescriptions.icons")} list={icons} />
              </div>
            </div>
          </section>
        </div>
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  const path = "/htmlcode";
  const toolData: ToolData = findTool(path);
  const letters = getLetters();
  const punctuations = getPunctuations();
  const currencies = getCurrencies();
  const mathematical = getMathematical();
  const diacritics = getDiacritics();
  const ascii = getAscii();
  const icons = getIcons();
  const pronunciations = getPronunciations();
  return {
    props: {
      toolData,
      letters,
      punctuations,
      currencies,
      mathematical,
      diacritics,
      ascii,
      icons,
      pronunciations,
      ...(await serverSideTranslations(locale, ["common", "htmlcode"])),
    },
  };
};

export default HtmlCodePage;
