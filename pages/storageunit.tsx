import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ChangeEvent, useMemo, useState } from "react";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { CopyButton } from "../components/copybtn";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { findTool, ToolData } from "../libs/tools";
import { convert, getStorageUnitData, StorageUnitData, storageUnitList } from "../utils/storage";

interface ConversionOutput {
  unit: StorageUnitData;
  value: number;
  valueView: string;
}

function formatByComma(value: string): string {
  if (value.includes("e")) {
    return value;
  }
  const dotIndex = value.indexOf(".");
  if (dotIndex > 0) {
    const high = value.substring(0, dotIndex);
    return high.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") + value.substring(dotIndex);
  } else {
    return value.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
  }
}

function Conversion() {
  const { t } = useTranslation("storageunit");
  const [current, setCurrent] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>("GB");

  const [measurements, setMeasurementTypes] = useState<string[]>(["Decimal"]);

  const unitList = useMemo(
    () => storageUnitList.filter((data) => data.type == "Base" || measurements.includes(data.type)),
    [measurements]
  );

  const selectedUnitData = useMemo(() => getStorageUnitData(selectedUnit), [selectedUnit]);

  const outputs = useMemo(() => {
    const currentUnitData = getStorageUnitData(selectedUnit);
    if (!currentUnitData) return [];

    const result: ConversionOutput[] = [];
    for (var i = 0; i < unitList.length; i++) {
      let targetUnitData = unitList[i];
      if (targetUnitData.unit != selectedUnit) {
        let value = convert(current, currentUnitData, targetUnitData);
        result.push({
          unit: targetUnitData,
          value: value,
          valueView: formatByComma(value.toString()),
        });
      }
    }
    return result;
  }, [selectedUnit, current, unitList]);

  function toggleMeasurementTypes(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    const checked = event.target.checked;

    if (checked) {
      setMeasurementTypes([...measurements, value]);
    } else if (measurements.length >= 2) {
      setMeasurementTypes(measurements.filter((data) => data != value));
    }
  }

  return (
    <section id="conversion">
      <div className="mt-4">
        <label htmlFor="currentInput" className="form-label h5 text-primary fw-bolder ">
          {t("conversion", { unit: selectedUnitData?.title })}
        </label>
        <input
          type="number"
          className="form-control form-control-lg"
          id="currentInput"
          min={0}
          placeholder=""
          value={current}
          onChange={(e) => {
            setCurrent(parseFloat(e.target.value));
          }}
        />
      </div>
      <div className="row">
        <div className="col-12 col-lg-6 mt-4">
          <select
            className="form-select form-select-lg"
            value={selectedUnit}
            aria-label="Storage Unit"
            onChange={(e) => {
              setSelectedUnit(e.target.value);
            }}
          >
            {unitList.map((data) => {
              return (
                <option key={data.unit} value={data.unit}>
                  {data.title}
                </option>
              );
            })}
          </select>
        </div>
        <div className="col-12 col-lg-6 mt-4">
          <div className="d-flex justify-content-start align-items-center">
            <div className="form-check col-auto form-control-lg">
              <input
                className="form-check-input"
                type="checkbox"
                value="Decimal"
                id="decimalCheck"
                checked={measurements.includes("Decimal")}
                onChange={toggleMeasurementTypes}
              />
              <label className="form-check-label" htmlFor="decimalCheck">
                {t("decimal")}
              </label>
            </div>
            <div className="form-check col-auto form-control-lg">
              <input
                className="form-check-input"
                type="checkbox"
                value="Binary"
                id="binaryCheck"
                checked={measurements.includes("Binary")}
                onChange={toggleMeasurementTypes}
              />
              <label className="form-check-label" htmlFor="binaryCheck">
                {t("binary")}
              </label>
            </div>
            <div className="form-check col-auto form-control-lg">
              <input
                className="form-check-input"
                type="checkbox"
                value="Bit"
                id="bitCheck"
                checked={measurements.includes("Bit")}
                onChange={toggleMeasurementTypes}
              />
              <label className="form-check-label" htmlFor="bitCheck">
                {t("bit")}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive mt-3">
        <table className="table caption-top table-striped table-hover table-bordered align-middle text-start">
          <caption>{t("conversionOutput")}</caption>
          <thead className="table-dark">
            <tr>
              <th>{t("measurement")}</th>
              <th>{t("conversionCol")}</th>
            </tr>
          </thead>
          <tbody className="table-group-divider">
            {outputs.map((op, index) => {
              return (
                <tr key={op.unit.unit}>
                  <th scope="row">
                    {op.unit.title} (<span className="text-danger">{op.unit.unit}</span>)
                  </th>
                  <td>
                    {op.valueView}
                    <CopyButton getContent={() => op.value.toString()} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConversionTable({ list }: { list: { from: string; target: string }[] }) {
  return (
    <table className="table table-striped table-hover table-bordered align-middle text-center">
      <tbody>
        {list.map((cnv, index) => {
          const fromUnitData = getStorageUnitData(cnv.from);
          const targetUnitData = getStorageUnitData(cnv.target);
          if (!fromUnitData || !targetUnitData) {
            throw "Invalid conversion table";
          }
          let value = convert(1, fromUnitData, targetUnitData);
          let valueView = formatByComma(value.toString());
          return (
            <tr key={index}>
              <th scope="row">
                1 <span className="text-primary">{cnv.from}</span>
              </th>
              <td className="text-start">
                {valueView} <span className="text-success fw-bold">{cnv.target}</span>
                <CopyButton className="" getContent={() => value.toString()} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MostConversionList() {
  const cnvList = [
    [
      { from: "KB", target: "KiB" },
      { from: "MB", target: "MiB" },
      { from: "GB", target: "GiB" },
      { from: "TB", target: "TiB" },
      { from: "PB", target: "PiB" },
    ],
    [
      { from: "KiB", target: "KB" },
      { from: "MiB", target: "MB" },
      { from: "GiB", target: "GB" },
      { from: "TiB", target: "TB" },
      { from: "PiB", target: "PB" },
    ],
    [
      { from: "KB", target: "Byte" },

      { from: "MB", target: "Byte" },
      { from: "MB", target: "KB" },

      { from: "GB", target: "Byte" },
      { from: "GB", target: "KB" },
      { from: "GB", target: "MB" },

      { from: "TB", target: "Byte" },
      { from: "TB", target: "KB" },
      { from: "TB", target: "MB" },
      { from: "TB", target: "GB" },

      { from: "PB", target: "Byte" },
      { from: "PB", target: "KB" },
      { from: "PB", target: "MB" },
      { from: "PB", target: "GB" },
      { from: "PB", target: "TB" },
    ],
    [
      { from: "KiB", target: "Byte" },

      { from: "MiB", target: "Byte" },
      { from: "MiB", target: "KiB" },

      { from: "GiB", target: "Byte" },
      { from: "GiB", target: "KiB" },
      { from: "GiB", target: "MiB" },

      { from: "TiB", target: "Byte" },
      { from: "TiB", target: "KiB" },
      { from: "TiB", target: "MiB" },
      { from: "TiB", target: "GiB" },

      { from: "PiB", target: "Byte" },
      { from: "PiB", target: "KiB" },
      { from: "PiB", target: "MiB" },
      { from: "PiB", target: "GiB" },
      { from: "PiB", target: "TiB" },
    ],
    [
      { from: "Kbit", target: "Bit" },

      { from: "Mbit", target: "Bit" },
      { from: "Mbit", target: "Kbit" },

      { from: "Gbit", target: "Bit" },
      { from: "Gbit", target: "Kbit" },
      { from: "Gbit", target: "Mbit" },

      { from: "Tbit", target: "Bit" },
      { from: "Tbit", target: "Kbit" },
      { from: "Tbit", target: "Mbit" },
      { from: "Tbit", target: "Gbit" },

      { from: "Pbit", target: "Bit" },
      { from: "Pbit", target: "Kbit" },
      { from: "Pbit", target: "Mbit" },
      { from: "Pbit", target: "Gbit" },
      { from: "Pbit", target: "Tbit" },
    ],
  ];

  return (
    <section id="conversionTable" className="mt-4">
      <div className="row">
        {cnvList.map((list, index) => {
          return (
            <div key={index} className="col-12 col-md-6">
              <ConversionTable list={list} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
function StorageUnitPage({ toolData }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation("storageunit");
  return (
    <>
      <ToolPageHeadBuilder toolPath="/storageunit" />
      <Layout title={toolData.title}>
        <div className="container pt-3">
          <Conversion />
          <div className="text-center h5 mt-4 text-uppercase">{t("commonConversionTable")}</div>
          <hr className="text-danger" />
          <MostConversionList />
        </div>
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  const path = "/storageunit";
  const toolData: ToolData = findTool(path);
  return {
    props: {
      toolData,
      ...(await serverSideTranslations(locale, ["common", "storageunit"])),
    },
  };
};

export default StorageUnitPage;
