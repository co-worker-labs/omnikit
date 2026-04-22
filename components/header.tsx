import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { getTranslatedTools, ToolData } from "../libs/tools";
import logoIcon from "../public/favicon.ico";
import { useTheme } from "../libs/theme";
import { useTranslation } from "next-i18next/pages";
import LanguageSwitcher from "./language_switcher";

export type HeaderPosition = "sticky" | "none" | "hidden";

export default function Header({ position, title }: { position: HeaderPosition; title?: string }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation("common");

  const clz = (): string => {
    switch (position) {
      case "sticky":
        return "sticky-top";
      default:
        return "";
    }
  };

  const tools = getTranslatedTools(t);
  const currentTool = tools.find((tool) => tool.path === router.asPath);

  if (position == "hidden") {
    return <></>;
  }
  /**
     * <div className="col col-md-5 d-flex" role="search">
     * <input className="form-control" type="search" placeholder="Search" aria-label="Search" />
            <button className="btn btn-outline-success ms-1" type="button">Search</button>
     */
  return (
    <>
      <nav
        className={`navbar ${theme === "dark" ? "navbar-dark bg-dark" : "navbar-light bg-light"} ${clz()}`}
      >
        <div className="container-fluid px-lg-4">
          <Link className="navbar-brand col-auto col-md" href={"/"}>
            <Image
              src={logoIcon}
              alt="Logo"
              height={28}
              width={28}
              className="d-inline-block align-text-top me-2"
            />
            <span className={`fw-bold ${!title ? "" : " d-none d-md-inline"}`}>
              {t("nav.brand")}
            </span>
          </Link>
          {title && (
            <Link
              className="nav-link active text-secondary fw-bold text-nowrap col text-center text-truncate"
              aria-current="page"
              href={""}
              onClick={() => {
                router.reload();
              }}
            >
              {title}
            </Link>
          )}
          <div className="col-auto col-md d-flex justify-content-end align-items-center">
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-grid-3x3-gap"></i>
                <span className="d-none d-md-inline ms-2">
                  {currentTool?.title || t("nav.tools")}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                {tools.map((tool) => (
                  <li key={tool.path}>
                    <a
                      className={`dropdown-item ${tool.path === router.asPath ? "active" : ""}`}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(tool.path);
                      }}
                    >
                      {tool.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary ms-2"
              onClick={toggleTheme}
              aria-label={t(theme === "dark" ? "nav.switchToLight" : "nav.switchToDark")}
            >
              <i className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon"}`}></i>
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
    </>
  );
}
