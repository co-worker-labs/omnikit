"use client";

import { ChangeEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { CopyButton } from "../../../components/ui/copy-btn";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import {
  convert,
  getStorageUnitData,
  StorageUnitData,
  storageUnitList,
} from "../../../utils/storage";
import { StyledInput } from "../../../components/ui/input";
import { StyledSelect } from "../../../components/ui/input";
import { StyledCheckbox } from "../../../components/ui/input";

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
  const t = useTranslations("storageunit");
  const tc = useTranslations("common");
  const [current, setCurrent] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>("GB");

  const [measurements, setMeasurementTypes] = useState<string[]>(["Decimal"]);

  const unitList = storageUnitList.filter(
    (data) => data.type == "Base" || measurements.includes(data.type)
  );

  const selectedUnitData = getStorageUnitData(selectedUnit);

  const outputs = (() => {
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
  })();

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
      <div>
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
            <span className="font-mono text-sm font-semibold text-accent-cyan">
              {t("conversion", { unit: selectedUnitData?.title ?? "" })}
            </span>
          </div>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setCurrent(1);
              showToast(tc("reset"), "success", 2000);
            }}
          >
            {tc("reset")}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex-1">
            <StyledInput
              type="number"
              id="currentInput"
              min={0}
              placeholder=""
              value={current}
              onChange={(e) => {
                setCurrent(parseFloat(e.target.value));
              }}
              className="text-lg font-mono rounded-full font-bold text-center w-full"
            />
          </div>
          <div className="flex-1">
            <StyledSelect
              value={selectedUnit}
              aria-label="Storage Unit"
              onChange={(e) => {
                setSelectedUnit(e.target.value);
              }}
              className="appearance-none rounded-full font-bold text-center w-full"
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
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            Measurement
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
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

      <div className="mt-4 rounded-lg border border-border-default overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-bg-elevated/40">
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {t("measurement")}
              </th>
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {t("conversionCol")}
              </th>
            </tr>
          </thead>
          <tbody>
            {outputs.map((op) => {
              return (
                <tr
                  key={op.unit.unit}
                  className="border-b border-border-default hover:bg-bg-elevated/60"
                >
                  <th
                    scope="row"
                    className="py-2.5 px-4 text-fg-secondary text-xs font-mono font-medium text-left whitespace-nowrap"
                  >
                    {op.unit.title} (<span className="text-danger">{op.unit.unit}</span>)
                  </th>
                  <td className="py-2.5 font-mono text-sm break-all">
                    {op.valueView}
                    <CopyButton
                      getContent={() => op.value.toString()}
                      className="ms-1.5 opacity-60 hover:opacity-100 transition-opacity"
                    />
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
    <div className="rounded-lg border border-border-default overflow-hidden">
      <table className="w-full">
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
              <tr
                key={index}
                className="border-b border-border-default last:border-b-0 hover:bg-bg-elevated/60"
              >
                <th
                  scope="row"
                  className="py-2.5 px-4 w-28 text-fg-secondary text-xs font-mono font-medium text-left whitespace-nowrap"
                >
                  1 <span className="text-accent-cyan">{cnv.from}</span>
                </th>
                <td className="py-2.5 px-4 font-mono text-sm">
                  {valueView} <span className="text-accent-cyan font-bold">{cnv.target}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cnvList.map((list, index) => {
          return (
            <div key={index}>
              <ConversionTable list={list} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function StorageUnitPage() {
  const t = useTranslations("tools");
  const ts = useTranslations("storageunit");
  return (
    <Layout title={t("storageunit.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <Conversion />
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border-default" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {ts("commonConversionTable")}
          </span>
          <div className="flex-1 h-px bg-border-default" />
        </div>
        <MostConversionList />
      </div>
    </Layout>
  );
}
