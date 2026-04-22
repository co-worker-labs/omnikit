import Head from "next/head";
import Layout from "../components/layout";
import { listMatchedTools, ToolData } from "../libs/tools";
import { useRouter } from "next/router";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { getTranslatedTools } from "../libs/tools";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Hash,
  FileCode,
  Lock,
  KeyRound,
  FileCheck,
  Type,
  Code,
  HardDrive,
  Terminal,
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
};

function Introduce() {
  const { t } = useTranslation("home");
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-bg-base via-bg-base to-bg-surface">
      <div className="bg-grid-pattern absolute inset-0" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-accent-cyan/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative container mx-auto px-4 py-20 md:py-28 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 px-4 py-1.5 text-sm text-accent-cyan">
          <Terminal size={14} />
          <span>{t("badge")}</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-fg-primary tracking-tight">
          {t("exploreTitle")}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-lg text-fg-secondary leading-relaxed">
          {t("subtitle")}
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
  const { t } = useTranslation(["common", "tools"]);
  const data = getTranslatedTools(t);

  return (
    <section className="container mx-auto px-4 pb-20 pt-12">
      <div className="mb-10 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-fg-primary">{t("toolsSectionTitle")}</h2>
        <p className="mt-2 text-fg-secondary">{t("toolsSectionSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((value, index) => {
          const isDisabled = value.path == "";
          const icon = toolIcons[value.path];
          return (
            <Card
              key={index}
              hover={!isDisabled}
              className={`group flex flex-col ${isDisabled ? "opacity-50" : ""}`}
            >
              <div className="flex flex-1 flex-col items-center p-5">
                {icon && (
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent-cyan/10 transition-colors group-hover:bg-accent-cyan/15">
                    {icon}
                  </div>
                )}

                <h3 className="font-semibold text-fg-primary text-center">{value.title}</h3>

                <p className="mt-2 line-clamp-3 text-sm text-fg-secondary text-center leading-relaxed">
                  {value.description}
                </p>

                <div className="mt-auto w-full pt-4">
                  <Button
                    variant={isDisabled ? "outline" : "primary"}
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => {
                      if (value.path) router.push(value.path);
                    }}
                    className="w-full"
                  >
                    {isDisabled ? t("common:common.comingSoon") : t("common:common.goto")}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
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
