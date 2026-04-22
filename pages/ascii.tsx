import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { ControlCode, getControlCodes, getPrintableCharacters } from "../libs/ascii";
import { findTool, ToolData } from "../libs/tools";
import styles from "../styles/Ascii.module.css";

function beautyPrint(
  code: number,
  radix: number,
  perLen: number,
  minLen: number,
  fillChar: string
) {
  let str = code.toString(radix);
  const fillCount = str.length % perLen;
  if (fillCount > 0) {
    let prefix = "";
    for (var i = 0; i < perLen - fillCount; i++) {
      prefix += fillChar;
    }
    str = prefix + str;
  }
  if (str.length < minLen) {
    for (var i = 0; i < minLen - str.length; i++) {
      str = fillChar + str;
    }
  }
  const divided = str.length / perLen;
  if (divided == 1) {
    return str;
  } else {
    const result: string[] = [];
    for (var i = 0; i < divided; i++) {
      const start = i * divided;
      result.push(str.substring(start, start + perLen));
    }
    return (
      <>
        {result.map((data, index) => {
          if (index == result.length - 1) {
            return (
              <span key={code + "_" + radix + "_" + index} className="text-success">
                {data}
              </span>
            );
          } else {
            return <span key={code + "_" + radix + "_" + index}>{data}&nbsp;&nbsp;</span>;
          }
        })}
      </>
    );
  }
}

function ControlCodeChart({ list }: { list: ControlCode[] }) {
  const { t } = useTranslation("ascii");
  return (
    <table className="table text-center table-striped table-hover table-bordered">
      <thead className="table-dark sticky-top" style={{ top: "3rem" }}>
        <tr className="text-uppercase">
          <th scope="col">{t("tableHeaders.decimal")}</th>
          <th scope="col">{t("tableHeaders.binary")}</th>
          <th scope="col">{t("tableHeaders.oct")}</th>
          <th scope="col">{t("tableHeaders.hex")}</th>
          <th scope="col">{t("tableHeaders.abbr")}</th>
          <th scope="col">{t("tableHeaders.desc")}</th>
        </tr>
      </thead>
      <tbody className="table-group-divider">
        {list.map((data, index) => {
          return (
            <tr key={data.code}>
              <td>{data.code}</td>
              <td>{beautyPrint(data.code, 2, 4, 8, "0")}</td>
              <td>{beautyPrint(data.code, 8, 3, 3, "0")}</td>
              <td className="text-uppercase">{beautyPrint(data.code, 16, 2, 2, "0")}</td>
              <td className="text-uppercase">
                {data.popular ? <span className="text-danger">{data.abbr}</span> : data.abbr}
              </td>
              <td>{data.popular ? <span className="text-danger">{data.desc}</span> : data.desc}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PrintableCharacters({ list }: { list: number[] }) {
  const { t } = useTranslation("ascii");
  function printGlyph(code: number) {
    let char = String.fromCharCode(code);

    if (char >= "0" && char <= "9") {
      return <span className="text-primary">{char}</span>;
    } else if ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z")) {
      return char;
    } else {
      if (char == " ") {
        char = "space";
      }
      return <span className="text-danger">{char}</span>;
    }
  }

  return (
    <table className="table text-center table-striped table-hover table-bordered">
      <thead className="table-dark sticky-top" style={{ top: "3rem" }}>
        <tr className="text-uppercase">
          <th scope="col">{t("tableHeaders.decimal")}</th>
          <th scope="col">{t("tableHeaders.binary")}</th>
          <th scope="col">{t("tableHeaders.oct")}</th>
          <th scope="col">{t("tableHeaders.hex")}</th>
          <th scope="col">{t("tableHeaders.html")}</th>
          <th scope="col">{t("tableHeaders.glyph")}</th>
        </tr>
      </thead>
      <tbody className="table-group-divider">
        {list.map((data, index) => {
          return (
            <tr key={data} className={[48, 65, 97].includes(data) ? "bg-warning" : ""}>
              <td>{data}</td>
              <td>{beautyPrint(data, 2, 4, 8, "0")}</td>
              <td>{beautyPrint(data, 8, 3, 3, "0")}</td>
              <td>{data.toString(16).toUpperCase()}</td>
              <td>
                <code>{"&#" + data + ";"}</code>
              </td>
              <td>{printGlyph(data)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AsciiPage({
  toolData,
  printableCharacters,
  controlCodes,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation(["ascii", "common"]);
  return (
    <>
      <ToolPageHeadBuilder toolPath="/ascii" />
      <Layout title={toolData.title}>
        <div className="container py-4">
          <section id="description" className="py-3">
            <p className={`${styles.description}`}>{t("ascii:description")}</p>
          </section>
          <section>
            <ul className="nav nav-tabs" id="myTab" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link active fw-bold"
                  id="home-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#home-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="home-tab-pane"
                  aria-selected="true"
                >
                  {t("ascii:printableCharacters")}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bold"
                  id="profile-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#profile-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="profile-tab-pane"
                  aria-selected="false"
                >
                  {t("ascii:controlCodeCharts")}
                </button>
              </li>
            </ul>
            <div className="tab-content mt-2" id="myTabContent">
              <div
                className="tab-pane fade show active"
                id="home-tab-pane"
                role="tabpanel"
                aria-labelledby="home-tab"
                tabIndex={0}
              >
                <PrintableCharacters list={printableCharacters} />
              </div>
              <div
                className="tab-pane fade"
                id="profile-tab-pane"
                role="tabpanel"
                aria-labelledby="profile-tab"
                tabIndex={1}
              >
                <ControlCodeChart list={controlCodes} />
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
  const path = "/ascii";
  const toolData: ToolData = findTool(path);
  const printableCharacters: number[] = getPrintableCharacters();
  const controlCodes: ControlCode[] = getControlCodes();

  return {
    props: {
      toolData: toolData,
      printableCharacters: printableCharacters,
      controlCodes: controlCodes,
      ...(await serverSideTranslations(locale, ["common", "ascii"])),
    },
  };
};

export default AsciiPage;
