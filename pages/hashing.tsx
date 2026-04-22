import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ChangeEvent, useMemo, useState } from "react";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { formatBytes } from "../utils/storage";
import { CopyButton } from "../components/copybtn";
import styles from "../styles/Hashing.module.css";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

const CryptoJS = require("crypto-js");

interface Result {
  title: string;
  size: string;

  md5: string;
  sha1: string;

  sha224: string;
  sha256: string;
  sha384: string;
  sha512: string;

  sha3_224: string;
  sha3_256: string;
  sha3_384: string;
  sha3_512: string;

  RIPEMD160: string;
}

function Display({ data }: { data: Result }) {
  const { t } = useTranslation(["common", "hashing"]);
  const [testChecksum, setTestChecksum] = useState<string>("");

  return (
    <>
      <div className="position-relative mt-2">
        <textarea
          className="form-control"
          placeholder={t("hashing:pasteToCompare")}
          rows={3}
          value={testChecksum}
          onChange={(e) => {
            setTestChecksum(e.target.value);
          }}
        ></textarea>
        <button
          type="button"
          className="btn btn-sm text-danger flex-col position-absolute end-0 top-0 fw-bold"
          data-toggle="tooltip"
          data-placement="right"
          title={t("common:common.clear")}
          onClick={(e) => {
            setTestChecksum("");
          }}
        >
          {t("common:common.clear")}
        </button>
      </div>
      <table className="table table-hover table-striped caption-top text-break mt-4">
        <tbody>
          <tr>
            <th scope="row">{t("common:common.size")}</th>
            <td>{data.size}</td>
          </tr>
          {data.md5 && (
            <tr>
              <th scope="row">MD5</th>
              <td className={data.md5 == testChecksum ? "text-success fw-bold" : ""}>
                {data.md5}
                <CopyButton getContent={() => data.md5} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha1 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA-1
              </th>
              <td className={data.sha1 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha1}
                <CopyButton getContent={() => data.sha1} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha224 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA-224
              </th>
              <td className={data.sha224 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha224}
                <CopyButton getContent={() => data.sha224} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha256 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA-256
              </th>
              <td className={data.sha256 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha256}
                <CopyButton getContent={() => data.sha256} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha384 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA-384
              </th>
              <td className={data.sha384 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha384}
                <CopyButton getContent={() => data.sha384} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha512 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA-512
              </th>
              <td className={data.sha512 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha512}

                <CopyButton getContent={() => data.sha512} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_224 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA3-224
              </th>
              <td className={data.sha3_224 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha3_224}
                <CopyButton getContent={() => data.sha3_224} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_256 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA3-256
              </th>
              <td className={data.sha3_256 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha3_256}
                <CopyButton getContent={() => data.sha3_256} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_384 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA3-384
              </th>
              <td className={data.sha3_384 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha3_384}
                <CopyButton getContent={() => data.sha3_384} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_512 && (
            <tr>
              <th scope="row" className="text-nowrap">
                SHA3-512
              </th>
              <td className={data.sha3_512 == testChecksum ? "text-success fw-bold" : ""}>
                {data.sha3_512}
                <CopyButton getContent={() => data.sha3_512} className="ms-1" />
              </td>
            </tr>
          )}
          {data.RIPEMD160 && (
            <tr>
              <th scope="row" className="text-nowrap">
                RIPEMD-160
              </th>
              <td className={data.RIPEMD160 == testChecksum ? "text-success fw-bold" : ""}>
                {data.RIPEMD160}
                <CopyButton getContent={() => data.RIPEMD160} className="ms-1" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

function TextHashing() {
  const { t } = useTranslation(["common", "hashing"]);
  const [types, setTypes] = useState<string[]>(["md5", "sha1", "sha256", "sha512"]);
  const [storageUnit, setStorageUnit] = useState<1000 | 1024>(1000);
  const [content, setContent] = useState<string>("");
  const [isTrim, setIsTrim] = useState<boolean>(true);

  const hashRes = useMemo<Result | undefined>(() => {
    const raw = isTrim ? content.trim() : content;
    if (!raw) return undefined;
    const length = Buffer.byteLength(content, "utf-8");
    const size = formatBytes(length, storageUnit);
    return {
      title: "Hashing Result",
      size: size,
      md5: types.includes("md5") ? CryptoJS.MD5(raw).toString() : "",
      sha1: types.includes("sha1") ? CryptoJS.SHA1(raw).toString() : "",
      sha224: types.includes("sha224") ? CryptoJS.SHA224(raw).toString() : "",
      sha256: types.includes("sha256") ? CryptoJS.SHA256(raw).toString() : "",
      sha384: types.includes("sha384") ? CryptoJS.SHA384(raw).toString() : "",
      sha512: types.includes("sha512") ? CryptoJS.SHA512(raw).toString() : "",
      sha3_224: types.includes("sha3-224")
        ? CryptoJS.SHA3(raw, { outputLength: 224 }).toString()
        : "",
      sha3_256: types.includes("sha3-256")
        ? CryptoJS.SHA3(raw, { outputLength: 256 }).toString()
        : "",
      sha3_384: types.includes("sha3-384")
        ? CryptoJS.SHA3(raw, { outputLength: 384 }).toString()
        : "",
      sha3_512: types.includes("sha3-512")
        ? CryptoJS.SHA3(raw, { outputLength: 512 }).toString()
        : "",
      RIPEMD160: types.includes("RIPEMD160") ? CryptoJS.RIPEMD160(raw).toString() : "",
    };
  }, [content, isTrim, storageUnit, types]);

  const [passphrase, setPassphrase] = useState<string>("");
  const hmacRes = useMemo<Result | undefined>(() => {
    const raw = isTrim ? content.trim() : content;
    if (!raw) return undefined;
    const phrase = passphrase.trim();
    if (!phrase) return undefined;
    const length = Buffer.byteLength(content, "utf-8");
    const size = formatBytes(length, storageUnit);
    return {
      title: "HMAC Result",
      size: size,
      md5: types.includes("md5") ? CryptoJS.HmacMD5(raw, phrase).toString() : "",
      sha1: types.includes("sha1") ? CryptoJS.HmacSHA1(raw, phrase).toString() : "",
      sha224: types.includes("sha224") ? CryptoJS.HmacSHA224(raw, phrase).toString() : "",
      sha256: types.includes("sha256") ? CryptoJS.HmacSHA256(raw, phrase).toString() : "",
      sha384: types.includes("sha384") ? CryptoJS.HmacSHA384(raw, phrase).toString() : "",
      sha512: types.includes("sha512") ? CryptoJS.HmacSHA512(raw, phrase).toString() : "",
      sha3_224: "",
      sha3_256: "",
      sha3_384: "",
      sha3_512:
        types.includes("sha3-224") ||
        types.includes("sha3-256") ||
        types.includes("sha3-384") ||
        types.includes("sha3-512")
          ? CryptoJS.HmacSHA3(raw, phrase).toString()
          : "",
      RIPEMD160: types.includes("RIPEMD160") ? CryptoJS.HmacRIPEMD160(raw, phrase).toString() : "",
    };
  }, [content, isTrim, passphrase, types, storageUnit]);

  function onToggleCheck(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    const value = event.target.value;
    if (checked) {
      const newTypes = [...types];
      newTypes.push(value);
      setTypes(newTypes);
    } else {
      setTypes(types.filter((it) => it != value));
    }
  }

  return (
    <section id="calculator">
      <div className="mt-4">
        <div className="row justify-content-between">
          <label htmlFor="contentTextarea" className="form-label col-auto">
            <span className="fw-bold text-primary">{t("hashing:plainText")}</span>
            <a
              href="#"
              className={`text-danger ms-2 ${styles.clearLink}`}
              onClick={() => {
                setContent("");
                showToast(t("common:common.cleared"), "danger", 2000);
              }}
            >
              {t("common:common.clear")}
            </a>
          </label>
          <div className="form-check col-auto">
            <input
              className="form-check-input"
              type="checkbox"
              aria-label="Removes the leading and trailing white space and line terminator characters from a string."
              id="isTrimCheck"
              checked={isTrim}
              onChange={(e) => {
                setIsTrim(e.target.checked);
              }}
            />
            <label className="form-check-label" htmlFor="isTrimCheck">
              {t("common:common.trimWhiteSpace")}
            </label>
          </div>
        </div>
        <div className="position-relative">
          <textarea
            className="form-control"
            id="contentTextarea"
            placeholder="Paster or type the plain text here"
            rows={5}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
          ></textarea>
          <CopyButton
            getContent={() => (isTrim ? content.trim() : content)}
            className="position-absolute end-0 top-0"
          />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="passphraseTextarea" className="form-label col-auto">
          <span className="fw-bold text-secondary">{t("hashing:secretPassphrase")}</span>
          <a
            href="#"
            className={`text-danger ms-2 ${styles.clearLink}`}
            onClick={() => {
              setPassphrase("");
              showToast(t("common:common.cleared"), "danger", 2000);
            }}
          >
            {t("common:common.clear")}
          </a>
        </label>
        <div className="position-relative">
          <textarea
            className="form-control"
            id="passphraseTextarea"
            placeholder={t("hashing:passphrasePlaceholder")}
            rows={2}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
            }}
          ></textarea>
          <CopyButton
            getContent={() => passphrase.trim()}
            className="position-absolute end-0 top-0"
          />
        </div>
      </div>
      <div className="mt-3 text-center">
        <button
          type="button"
          disabled={!content && !passphrase}
          className={`btn btn-sm btn-danger col-8 col-lg-3 rounded-pill text-uppercase`}
          onClick={() => {
            setContent("");
            setPassphrase("");
            showToast(t("common:common.allCleared"), "danger", 2000);
          }}
        >
          {t("common:common.clearAll")}
        </button>
      </div>

      <div className="row mt-3">
        <div className="col-auto d-flex align-items-center justify-content-start">
          <label className="fw-bolder col-auto">{t("common:common.storageUnit")} </label>
          <select
            className="form-select form-select-sm col ms-2"
            aria-label="Storage Unit"
            value={storageUnit}
            onChange={(e) => {
              setStorageUnit(parseInt(e.target.value) as 1000 | 1024);
            }}
          >
            <option value="1000">{t("hashing:storageUnit1000")}</option>
            <option value="1024">{t("hashing:storageUnit1024")}</option>
          </select>
        </div>
      </div>
      <div className="row px-3">
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="md5"
            id={"md5Check"}
            checked={types.includes("md5")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"md5Check"}>
            {" "}
            MD5
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha1"
            id={"sha1Check"}
            checked={types.includes("sha1")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha1Check"}>
            {" "}
            SHA-1
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha224"
            id={"sha224Check"}
            checked={types.includes("sha224")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha224Check"}>
            {" "}
            SHA-224
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha256"
            id={"sha256Check"}
            checked={types.includes("sha256")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha256Check"}>
            {" "}
            SHA-256
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha384"
            id={"sha384Check"}
            checked={types.includes("sha384")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha384Check"}>
            {" "}
            SHA-384
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha512"
            id={"sha512Check"}
            checked={types.includes("sha512")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha512Check"}>
            {" "}
            SHA-512
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha3-224"
            id={"sha3-224Check"}
            checked={types.includes("sha3-224")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha3-224Check"}>
            {" "}
            SHA3-224
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha3-256"
            id={"sha3-256Check"}
            checked={types.includes("sha3-256")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha3-256Check"}>
            {" "}
            SHA3-256
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha3-384"
            id={"sha3-384Check"}
            checked={types.includes("sha3-384")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha3-384Check"}>
            {" "}
            SHA3-384
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="sha3-512"
            id={"sha3-512Check"}
            checked={types.includes("sha3-512")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"sha3-512Check"}>
            {" "}
            SHA3-512
          </label>
        </div>
        <div className="form-check form-check-lg col-auto mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            value="RIPEMD160"
            id={"RIPEMD160Check"}
            checked={types.includes("RIPEMD160")}
            onChange={onToggleCheck}
          />
          <label className="form-check-label" htmlFor={"RIPEMD160Check"}>
            {" "}
            RIPEMD-160
          </label>
        </div>
      </div>
      {hashRes && (
        <div className="mt-4">
          <ul className="nav nav-tabs" id="myTab" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className="nav-link active fw-bolder"
                id="hashing-tab"
                data-bs-toggle="tab"
                data-bs-target="#hashing-tab-pane"
                type="button"
                role="tab"
                aria-controls="hashing-tab-pane"
                aria-selected="true"
              >
                {t("common:common.hashing")}
              </button>
            </li>
            {hmacRes && (
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link fw-bolder"
                  id="hmac-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#hmac-tab-pane"
                  type="button"
                  role="tab"
                  aria-controls="hmac-tab-pane"
                  aria-selected="false"
                >
                  {t("common:common.hmac")}
                </button>
              </li>
            )}
          </ul>
          <div className="tab-content" id="myTabContent">
            <div
              className="tab-pane fade show active"
              id="hashing-tab-pane"
              role="tabpanel"
              aria-labelledby="hashing-tab"
              tabIndex={0}
            >
              <Display data={hashRes} />
            </div>
            {hmacRes && (
              <div
                className="tab-pane fade"
                id="hmac-tab-pane"
                role="tabpanel"
                aria-labelledby="hmac-tab"
                tabIndex={1}
              >
                <Display data={hmacRes} />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Description() {
  const { t } = useTranslation("hashing");
  return (
    <section id="description" className="mt-5 paragraph">
      <div>
        <h5>{t("descriptions.md5Title")}</h5>
        <p>{t("descriptions.md5")}</p>
      </div>
      <div>
        <h5>{t("descriptions.sha1Title")}</h5>
        <p>{t("descriptions.sha1")}</p>
      </div>
      <div>
        <h5>{t("descriptions.sha2Title")}</h5>
        <p>{t("descriptions.sha2")}</p>
        <p>{t("descriptions.sha2extra")}</p>
      </div>
      <div>
        <h5>{t("descriptions.sha3Title")}</h5>
        <p>{t("descriptions.sha3")}</p>
      </div>
      <div>
        <h5>{t("descriptions.hmacTitle")}</h5>
        <p>{t("descriptions.hmac")}</p>
      </div>
    </section>
  );
}

function HashingPage() {
  const { t } = useTranslation(["common", "tools"]);
  const title = t("tools:hashing.title");

  return (
    <>
      <ToolPageHeadBuilder toolPath="/hashing" />
      <Layout title={title}>
        <div className="container py-3">
          <div className="alert alert-danger py-3 my-lg-4" role="alert">
            {t("common:alert.notTransferred")}
          </div>
          <TextHashing />
          <Description />
        </div>
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "hashing", "tools"])),
    },
  };
};

export default HashingPage;
