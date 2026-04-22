import Link from "next/link";
import { useRouter } from "next/router";
import { LayoutGrid, Sun, Moon } from "lucide-react";
import { getTranslatedTools } from "../libs/tools";
import { useTheme } from "../libs/theme";
import { useTranslation } from "next-i18next/pages";
import LanguageSwitcher from "./language_switcher";
import { Dropdown } from "./ui/dropdown";

export type HeaderPosition = "sticky" | "none" | "hidden";

export default function Header({ position, title }: { position: HeaderPosition; title?: string }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation("common");

  if (position === "hidden") {
    return <></>;
  }

  const tools = getTranslatedTools(t);
  const currentPath = router.asPath;

  const toolItems = tools.map((tool) => ({
    label: tool.title,
    onClick: () => router.push(tool.path),
    active: tool.path === currentPath,
  }));

  const positionClass = position === "sticky" ? "sticky top-0 z-50" : "";

  return (
    <>
      <nav className={`${positionClass} bg-bg-surface/80 backdrop-blur-md`}>
        <div className="mx-auto flex items-center justify-between px-4 py-2 lg:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-fg-primary hover:text-accent-cyan transition-colors"
          >
            <img src="/favicon.svg" alt="Logo" height={28} width={28} />
            <span className={`font-bold ${!title ? "" : "hidden md:inline"}`}>
              {t("nav.brand")}
            </span>
          </Link>

          {title && (
            <Link
              href=""
              onClick={(e) => {
                e.preventDefault();
                router.reload();
              }}
              className="mx-4 truncate text-center text-sm font-bold text-fg-secondary hover:text-fg-primary transition-colors"
            >
              {title}
            </Link>
          )}

          <div className="flex items-center gap-2">
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-colors"
                  aria-label={t("nav.tools")}
                >
                  <LayoutGrid size={16} />
                </button>
              }
              items={toolItems}
            />

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-colors"
              onClick={toggleTheme}
              aria-label={t(theme === "dark" ? "nav.switchToLight" : "nav.switchToDark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <LanguageSwitcher />
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent" />
      </nav>
    </>
  );
}
