import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { listMatchedTools, getTranslatedTools, ToolData } from "../libs/tools";
import logoIcon from "../public/favicon.ico";
import NoData from "./nodata";
import { useTheme } from "../libs/theme";
import { useTranslation } from "next-i18next/pages";
import LanguageSwitcher from "./language_switcher";

export type HeaderPosition = "sticky" | "none" | "hidden";

export default function Header({ position, title }: { position: HeaderPosition; title?: string }) {
  const [searchContent, setSearchContent] = useState<string>("");
  const [toolItems, setToolItems] = useState<ToolData[]>([]);
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

  function goto(path: string) {
    document.getElementById("searchModalCloseBtn")?.click();
    router.push(path);
  }

  function doSearch(filter: string) {
    const items = listMatchedTools(filter);
    setToolItems(items);
  }

  useEffect(() => {
    const searchModal = document.getElementById("searchModal");
    if (searchModal) {
      searchModal.addEventListener("shown.bs.modal", (event) => {
        const tools = getTranslatedTools(t);
        setToolItems(tools);
        document.getElementById("searchInput")?.focus();
      });
      searchModal.addEventListener("hidden.bs.modal", (event) => {
        setSearchContent("");
      });
    }
  }, []);

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
            <div
              className="input-group d-none d-md-flex w-75"
              role="search"
              onClick={() => {
                document.getElementById("searchModalBtn")?.click();
              }}
            >
              <input
                type="search"
                className="form-control"
                placeholder={t("nav.search")}
                aria-label="Search"
                aria-describedby="search-addon"
                value={searchContent}
                onChange={() => {}}
              />
              <button className="btn btn-outline-success" type="button" id="search-addon">
                {" "}
                <i className="bi bi-search"></i>
              </button>
            </div>
            <button
              className="btn d-inline d-md-none"
              type="button"
              onClick={() => {
                document.getElementById("searchModalBtn")?.click();
              }}
            >
              <i className="bi bi-search"></i>
            </button>
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
      <div>
        <button
          type="button"
          className="btn btn-primary"
          id="searchModalBtn"
          data-bs-toggle="modal"
          data-bs-target="#searchModal"
          hidden
        ></button>
        <div
          className="modal fade"
          id="searchModal"
          tabIndex={-1}
          aria-labelledby="searchModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-dialog-centered  modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <input
                  id="searchInput"
                  type="search"
                  role="search"
                  className="form-control form-control-lg"
                  placeholder={t("nav.search")}
                  value={searchContent}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchContent(value);
                    doSearch(value);
                  }}
                />
                <button
                  id="searchModalCloseBtn"
                  type="button"
                  className="btn-close d-block d-md-none"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="row text-center">
                  <>
                    {toolItems.length > 0 ? (
                      toolItems.map((value, index) => {
                        return (
                          <div className="col-12 col-md-6 col-lg-3 px-2 py-2" key={index}>
                            <div className="card">
                              <div className="card-body">
                                <h5 className="card-title text-primary fw-bold">{value.title}</h5>
                                <p
                                  className="card-text text-truncate text-wrap text-muted"
                                  style={{ height: "2.8rem" }}
                                >
                                  {value.description}
                                </p>
                                <div className="d-flex justify-content-center">
                                  <button
                                    type="button"
                                    className="btn btn-outline-success col-8"
                                    disabled={value.path == ""}
                                    onClick={() => {
                                      goto(value.path);
                                    }}
                                  >
                                    {value.path == "" ? t("common.comingSoon") : t("common.goto")}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <NoData />
                    )}
                  </>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
