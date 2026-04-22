import Link from "next/link";
import { useTranslation } from "next-i18next/pages";

export type FooterPosition = "sticky" | "fixed" | "none" | "hidden";

export default function Footer({ position }: { position: FooterPosition }) {
  const { t } = useTranslation("common");

  if (position == "hidden") {
    return <></>;
  }

  const clz = (): string => {
    switch (position) {
      case "fixed":
        return "fixed-bottom";
      case "sticky":
        return "sticky-bottom";
      case "none":
        return "";
    }
  };

  return (
    <footer className={`footer bg-body-tertiary pt-1 pb-2 ${clz()}`}>
      <div className="container-fluid">
        <div className="row align-items-center justify-content-lg-center gx-2">
          <div className="col-12 col-lg-6 pe-lg-4 order-lg-2">
            <ul className="nav nav-footer justify-content-center justify-content-lg-end">
              <li className="nav-item">
                <Link href={"/"} target="_self" className={`nav-link text-muted px-1`}>
                  {t("footer.home")}
                </Link>
              </li>
              <li className="nav-item">
                <Link href={"/tnc/terms"} target="_self" className={`nav-link text-muted px-2`}>
                  {t("footer.terms")}
                </Link>
              </li>
              <li className="nav-item">
                <Link href={"/tnc/privacy"} target="_self" className={`nav-link text-muted px-1`}>
                  {t("footer.privacy")}
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-12 col-lg-6 ps-lg-4 order-lg-1">
            <div className="copyright text-center text-sm text-muted text-lg-start">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
