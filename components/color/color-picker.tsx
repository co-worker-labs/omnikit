"use client";

import { useState, useSyncExternalStore } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { Pipette } from "lucide-react";
import { useTranslations } from "next-intl";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  showEyedropper?: boolean;
}

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

const emptySubscribe = () => () => {};

function useEyedropperSupported(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => "EyeDropper" in window,
    () => false
  );
}

export function ColorPicker({ value, onChange, showEyedropper = true }: ColorPickerProps) {
  const t = useTranslations("color.converter");
  const supportsEyedropper = useEyedropperSupported();

  async function pickFromScreen() {
    if (!window.EyeDropper) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      onChange(sRGBHex);
    } catch (err: unknown) {
      if (!(err instanceof DOMException) || err.name !== "AbortError") {
        console.error("EyeDropper failed", err);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full max-w-[280px] aspect-square">
        <HexAlphaColorPicker
          color={value}
          onChange={onChange}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      {showEyedropper && supportsEyedropper && (
        <button
          type="button"
          onClick={pickFromScreen}
          aria-label={t("eyedropper")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border-default text-sm text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-colors"
        >
          <Pipette size={14} />
          <span>{t("eyedropper")}</span>
        </button>
      )}
    </div>
  );
}
