import { useRouter } from "next/router";
import { useTranslation } from "next-i18next/pages";
import { Globe } from "lucide-react";
import { Dropdown } from "./ui/dropdown";

const languages = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "zh-CN", label: "简体中文", shortLabel: "中" },
  { code: "zh-TW", label: "繁體中文", shortLabel: "繁" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const currentLocale = router.locale || "en";

  function switchLocale(locale: string) {
    router.push(router.pathname, router.asPath, { locale });
  }

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-colors"
          aria-label={t("common.language")}
        >
          <Globe size={16} />
        </button>
      }
      items={languages.map((lang) => ({
        label: lang.label,
        onClick: () => switchLocale(lang.code),
        active: lang.code === currentLocale,
      }))}
    />
  );
}
