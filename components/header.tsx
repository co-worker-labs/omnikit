import Image from "next/image";
import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react";
import { listMatchedTools, ToolData } from "../libs/tools";
import logoIcon from '../public/favicon.ico'
import NoData from "./nodata";

export type HeaderPosition = 'sticky' | 'none' | 'hidden'

/**
 * dark theme switch: https://www.codeply.com/p/tnLBRfUKzy
 * @param param0 
 * @returns 
 */
// The approach used in this component shows how to build a sign in and sign out
// component that works on pages which support both client and server side
// rendering, and avoids any flash incorrect content on initial page load.
export default function Header({ position, title }: { position: HeaderPosition, title?: string }) {
  const [searchContent, setSearchContent] = useState<string>('');
  const [toolItems, setToolItems] = useState<ToolData[]>([]);
  const router = useRouter();

  const clz = (): string => {
    switch (position) {
      case 'sticky':
        return 'sticky-top';
      default:
        return '';
    }
  }

  function goto(path: string) {
    document.getElementById('searchModalCloseBtn')?.click();
    router.push(path);
  }

  function doSearch(filter: string) {
    const items = listMatchedTools(filter);
    setToolItems(items);
  }

  useEffect(() => {
    const searchModal = document.getElementById('searchModal')
    if (searchModal) {
      searchModal.addEventListener('shown.bs.modal', event => {
        const tools = listMatchedTools('');
        setToolItems(tools);
        document.getElementById('searchInput')?.focus();
      });
      searchModal.addEventListener('hidden.bs.modal', event => {
        setSearchContent('');
      });
    }
  }, [])

  if (position == 'hidden') {
    return <></>
  }
  /**
     * <div className="col col-md-5 d-flex" role="search">
     * <input className="form-control" type="search" placeholder="Search" aria-label="Search" />
            <button className="btn btn-outline-success ms-1" type="button">Search</button>
     */
  return (
    <>
      <nav className={`navbar navbar-light bg-light ${clz()}`} >
        <div className="container-fluid px-lg-4">
          <div className="col-auto col-md-6 col-lg-6">
            <Link className="navbar-brand" href={'/'}>
              <Image src={logoIcon} alt="Logo" height={28} width={28} className="d-inline-block align-text-top me-2" />
              <span className={`d-none d-md-inline text-dark fw-bold`}>W3tools Online</span>
            </Link>
            {title && <Link className="nav-link active d-none d-md-inline text-secondary fw-bold text-nowrap" aria-current="page" href={'#'}>
              @{title}
            </Link>
            }
          </div>
          
          <div className="col col-md-4 col-lg-3">
            <div className="input-group" role="search" onClick={() => {
              document.getElementById('searchModalBtn')?.click();
            }}>
              <input type="search" className="form-control" placeholder="Search" aria-label="Search" aria-describedby="search-addon" value={searchContent} onChange={() => { }} />
              <button className="btn btn-outline-success" type="button" id="search-addon"> <i className="bi bi-search"></i></button>
            </div>
          </div>
        </div>
      </nav>
      <div>
        <button type="button" className="btn btn-primary" id="searchModalBtn" data-bs-toggle="modal" data-bs-target="#searchModal" hidden></button>
        <div className="modal fade" id="searchModal" tabIndex={-1} aria-labelledby="searchModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered  modal-xl modal-dialog-scrollable">
            <div className="modal-content">

              <div className="modal-header">
                <input id="searchInput" type="search" role="search" className="form-control form-control-lg" placeholder="Search"
                  value={searchContent} onChange={(e) => {
                    const value = e.target.value;
                    setSearchContent(value);
                    doSearch(value);
                  }} />
                <button id="searchModalCloseBtn" type="button" className="btn-close d-block d-md-none" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="row text-center">
                  <>
                    {
                      toolItems.length > 0 ? toolItems.map((value, index) => {
                        return (
                          <div className="col-12 col-md-6 col-lg-3 px-2 py-2" key={index}>
                            <div className="card" >
                              <div className="card-body">
                                <h5 className="card-title text-primary fw-bold">{value.title}</h5>
                                <p className="card-text text-truncate text-wrap text-muted" style={{ 'height': '2.8rem' }}>{value.description}</p>
                                <div className="d-flex justify-content-center">
                                  <button type="button" className="btn btn-outline-success col-8" disabled={value.path == ''} onClick={() => {
                                    goto(value.path);
                                  }}>{value.path == '' ? 'Coming Soon' : 'Goto'}</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }) : <NoData />
                    }
                  </>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}