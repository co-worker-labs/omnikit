import { useRouter } from "next/router";
import { useTranslation } from "next-i18next/pages";
import { useState, useRef, useEffect } from "react";

const languages = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "zh-CN", label: "简体中文", shortLabel: "中" },
  { code: "zh-TW", label: "繁體中文", shortLabel: "繁" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLocale = router.locale || "en";
  const currentLang = languages.find((l) => l.code === currentLocale) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(locale: string) {
    router.push(router.pathname, router.asPath, { locale });
    setIsOpen(false);
  }

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={t("common.language")}
      >
        <i className="bi bi-globe"></i>
      </button>
      {isOpen && (
        <ul
          className="dropdown-menu dropdown-menu-end show"
          style={{ position: "absolute", right: 0 }}
        >
          {languages.map((lang) => (
            <li key={lang.code}>
              <button
                className={`dropdown-item ${lang.code === currentLocale ? "active" : ""}`}
                onClick={() => switchLocale(lang.code)}
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
