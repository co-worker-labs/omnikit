"use client";

import Layout from "../../../components/layout";
import { useTranslations } from "next-intl";

function encodeComponent(input: string): string {
  return encodeURIComponent(input);
}

function decodeComponent(input: string): string {
  return decodeURIComponent(input);
}

function encodeUrl(input: string): string {
  return encodeURI(input);
}

function decodeUrl(input: string): string {
  return decodeURI(input);
}

function encodeForm(input: string): string {
  const normalized = input.replace(/\r\n|\r|\n/g, "\r\n");
  return new URLSearchParams({ v: normalized }).toString().slice(2);
}

function decodeForm(input: string): string {
  const escaped = input.replace(/&/g, "%26").replace(/=/g, "%3D");
  return new URLSearchParams("v=" + escaped).get("v") ?? "";
}

type Mode = "component" | "url" | "form";

function encodeFor(mode: Mode, input: string): string {
  if (mode === "component") return encodeComponent(input);
  if (mode === "url") return encodeUrl(input);
  return encodeForm(input);
}

function decodeFor(mode: Mode, input: string): string {
  if (mode === "component") return decodeComponent(input);
  if (mode === "url") return decodeUrl(input);
  return decodeForm(input);
}

export default function UrlencoderPage() {
  const t = useTranslations("tools");
  const title = t("urlencoder.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6"></div>
    </Layout>
  );
}
