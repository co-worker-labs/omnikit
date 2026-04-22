import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ChangeEvent, useMemo, useState } from "react";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { CopyButton } from "../components/ui/copy-btn";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { findTool, ToolData } from "../libs/tools";
import { convert, getStorageUnitData, StorageUnitData, storageUnitList } from "../utils/storage";
import { StyledInput } from "../components/ui/input";
import { StyledSelect } from "../components/ui/input";
import { StyledCheckbox } from "../components/ui/input";

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
        <label htmlFor="currentInput" className="text-lg font-bold text-accent-cyan">
          {t("conversion", { unit: selectedUnitData?.title })}
        </label>
        <StyledInput
          type="number"
          id="currentInput"
          min={0}
          placeholder=""
          value={current}
          onChange={(e) => {
            setCurrent(parseFloat(e.target.value));
          }}
          className="mt-1 text-lg"
        />
      </div>
      <div className="flex flex-wrap items-center">
        <div className="w-full lg:w-1/2 mt-4">
          <StyledSelect
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
          </StyledSelect>
        </div>
        <div className="w-full lg:w-1/2 mt-4 lg:pl-6">
          <div className="flex justify-start items-center gap-4">
            <StyledCheckbox
              label={t("decimal")}
              value="Decimal"
              id="decimalCheck"
              checked={measurements.includes("Decimal")}
              onChange={toggleMeasurementTypes}
            />
            <StyledCheckbox
              label={t("binary")}
              value="Binary"
              id="binaryCheck"
              checked={measurements.includes("Binary")}
              onChange={toggleMeasurementTypes}
            />
            <StyledCheckbox
              label={t("bit")}
              value="Bit"
              id="bitCheck"
              checked={measurements.includes("Bit")}
              onChange={toggleMeasurementTypes}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="w-full border-collapse">
          <caption className="text-left text-fg-secondary text-sm mb-2">
            {t("conversionOutput")}
          </caption>
          <thead>
            <tr className="bg-bg-elevated">
              <th className="py-2 px-3 border border-border-default text-left text-sm text-fg-muted">
                {t("measurement")}
              </th>
              <th className="py-2 px-3 border border-border-default text-left text-sm text-fg-muted">
                {t("conversionCol")}
              </th>
            </tr>
          </thead>
          <tbody>
            {outputs.map((op) => {
              return (
                <tr key={op.unit.unit} className="even:bg-bg-elevated/50 hover:bg-bg-elevated/80">
                  <th scope="row" className="py-2 px-3 border border-border-default text-sm">
                    {op.unit.title} (<span className="text-danger">{op.unit.unit}</span>)
                  </th>
                  <td className="py-2 px-3 border border-border-default text-sm font-mono">
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
    <table className="w-full text-center border-collapse">
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
            <tr key={index} className="even:bg-bg-elevated/50 hover:bg-bg-elevated/80">
              <th scope="row" className="py-2 px-3 border border-border-default text-sm w-[120px]">
                1 <span className="text-accent-cyan">{cnv.from}</span>
              </th>
              <td className="py-2 px-3 border border-border-default text-sm text-left">
                {valueView} <span className="text-accent-cyan font-bold">{cnv.target}</span>
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
      <div className="flex flex-wrap">
        {cnvList.map((list, index) => {
          return (
            <div key={index} className="w-full md:w-1/2">
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
        <div className="container mx-auto px-4 pt-3">
          <Conversion />
          <div className="text-center text-lg mt-4 uppercase font-semibold text-fg-primary">
            {t("commonConversionTable")}
          </div>
          <hr className="border-danger" />
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
