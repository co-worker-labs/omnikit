import Link from "next/link";
import { useTranslation } from "next-i18next/pages";

export type FooterPosition = "sticky" | "fixed" | "none" | "hidden";

export default function Footer({ position }: { position: FooterPosition }) {
  const { t } = useTranslation("common");

  if (position === "hidden") {
    return <></>;
  }

  const positionClass = (() => {
    switch (position) {
      case "fixed":
        return "fixed bottom-0 left-0 right-0";
      case "sticky":
        return "sticky bottom-0";
      case "none":
        return "";
    }
  })();

  return (
    <footer className={`bg-bg-surface border-t border-border-default py-2 px-4 ${positionClass}`}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 sm:flex-row">
        <p className="text-fg-muted text-xs">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
        <nav className="flex items-center gap-3">
          <Link href="/" className="text-fg-muted text-xs hover:text-accent-cyan transition-colors">
            {t("footer.home")}
          </Link>
          <Link
            href="/tnc/terms"
            className="text-fg-muted text-xs hover:text-accent-cyan transition-colors"
          >
            {t("footer.terms")}
          </Link>
          <Link
            href="/tnc/privacy"
            className="text-fg-muted text-xs hover:text-accent-cyan transition-colors"
          >
            {t("footer.privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
