"use client";

import Layout from "../../components/layout";
import { useRouter } from "../../i18n/navigation";
import { useTranslations } from "next-intl";
import { getToolCards } from "../../libs/tools";
import { Card } from "../../components/ui/card";

import {
  Hash,
  FileCode,
  Lock,
  KeyRound,
  FileCheck,
  Type,
  Code,
  HardDrive,
  FingerprintPattern,
  Percent,
  GitCompare,
  FileText,
  FileJson,
  Database,
  ShieldCheck,
  Clock,
  QrCode,
  CaseSensitive,
  Palette,
  Globe,
  Regex,
  FileSpreadsheet,
} from "lucide-react";

const toolIcons: Record<string, React.ReactNode> = {
  "/hashing": <Hash size={28} className="text-accent-cyan" />,
  "/base64": <FileCode size={28} className="text-accent-cyan" />,
  "/cipher": <Lock size={28} className="text-accent-cyan" />,
  "/password": <KeyRound size={28} className="text-accent-cyan" />,
  "/checksum": <FileCheck size={28} className="text-accent-cyan" />,
  "/ascii": <Type size={28} className="text-accent-cyan" />,
  "/htmlcode": <Code size={28} className="text-accent-cyan" />,
  "/storageunit": <HardDrive size={28} className="text-accent-cyan" />,
  "/uuid": <FingerprintPattern size={28} className="text-accent-cyan" />,
  "/urlencoder": <Percent size={28} className="text-accent-cyan" />,
  "/diff": <GitCompare size={28} className="text-accent-cyan" />,
  "/markdown": <FileText size={28} className="text-accent-cyan" />,
  "/json": <FileJson size={28} className="text-accent-cyan" />,
  "/dbviewer": <Database size={28} className="text-accent-cyan" />,
  "/jwt": <ShieldCheck size={28} className="text-accent-cyan" />,
  "/unixtime": <Clock size={28} className="text-accent-cyan" />,
  "/cron": <Clock size={28} className="text-accent-cyan" />,
  "/qrcode": <QrCode size={28} className="text-accent-cyan" />,
  "/textcase": <CaseSensitive size={28} className="text-accent-cyan" />,
  "/color": <Palette size={28} className="text-accent-cyan" />,
  "/httpstatus": <Globe size={28} className="text-accent-cyan" />,
  "/regex": <Regex size={28} className="text-accent-cyan" />,
  "/csv": <FileSpreadsheet size={28} className="text-accent-cyan" />,
};

function Introduce() {
  const t = useTranslations("home");
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-bg-base via-bg-base to-bg-surface">
      <div className="bg-grid-pattern absolute inset-0" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[250px] w-[600px] rounded-full bg-accent-cyan/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-6 py-12 md:py-16 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-mono font-bold text-fg-primary tracking-tight leading-snug">
          {t("subtitle")}
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-lg text-fg-secondary leading-relaxed">
          {t("tagline")}
        </p>

        <div className="mx-auto mt-8 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-accent-cyan/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan/60" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-accent-cyan/40" />
        </div>
      </div>
    </section>
  );
}

function ToolCollection() {
  const router = useRouter();
  const t = useTranslations("tools");
  const tools = getToolCards(t);

  return (
    <section className="container mx-auto px-4 pb-20 pt-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map((tool) => {
          const icon = toolIcons[tool.path];
          return (
            <Card
              key={tool.path}
              hover
              className="group flex flex-col cursor-pointer"
              onClick={() => router.push(tool.path)}
            >
              <div className="flex flex-1 flex-col items-center p-5">
                {icon && (
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent-cyan/10 transition-colors group-hover:bg-accent-cyan/15">
                    {icon}
                  </div>
                )}

                <h3 className="font-semibold text-fg-primary text-center">{tool.title}</h3>

                <p className="mt-2 line-clamp-2 text-sm text-fg-secondary text-center leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <Layout headerPosition="none">
      <Introduce />
      <ToolCollection />
    </Layout>
  );
}
