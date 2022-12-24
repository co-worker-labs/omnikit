import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Layout from '../components/layout'
import { listMatchedTools, ToolData } from '../libs/tools'
import { useRouter } from 'next/router'
import { GetStaticProps, InferGetStaticPropsType } from 'next'

function Introduce() {
  return (
    <div className={`${styles.introduce}`}>
      <div className='container text-center'>
        <span className={`h1 text-capitalize fw-bolder ${styles.introduceTitle}`}>Search amazing Tools</span>
        <p className='mt-5 fs-5'>
          We offer those to the community for free, but our day job is building and selling useful tools for developers like you.
        </p>
      </div>
    </div>
  )
}

function ToolCollection({ data }: { data: ToolData[] }) {
  const router = useRouter();
  return (
    <div className='container text-center px-3 mb-5'>
      <div className={`h1 text-capitalize fw-bolder mt-5 ${styles.toolCollectionTitle}`}>
        Tools Collection
      </div>
      <div className='mb-3 mt-3'>
        <i className="bi bi-heart-pulse me-2 fs-4 text-primary"></i>
      </div>
      <div className="row">
        <>
          {
            data.map((value, index) => {
              return (
                <div className="col-12 col-md-6 col-lg-3 px-2 py-2" key={index}>
                  <div className="card" >
                    <div className="card-body">
                      <h5 className="card-title text-dark fw-bold">{value.title}</h5>
                      <p className="card-text text-truncate text-wrap text-muted" style={{ 'height': '2.8rem' }}>{value.description}</p>
                      <div className="d-flex justify-content-center">
                        <button type="button" className="btn btn-outline-success col-8" disabled={value.path == ''} onClick={() => {
                          router.push(value.path);
                        }}>{value.path == '' ? 'Coming Soon' : 'Goto'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          }
        </>
      </div>
    </div>
  )
}

export default function Home({ tools }: InferGetStaticPropsType<typeof getStaticProps>) {
  const keywords: string[] = [];
  tools.forEach((value: ToolData) => {
    keywords.push(...value.keywords);
  });
  return (
    <>
      <Head>
        <title>W3Tools Online</title>
        <meta name="description" content="Auesome online Tools" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name='keyword' content={keywords.join(',')} />
      </Head>
      <Layout headerPosition='none' asideAds={false}>
          <Introduce />
          <ToolCollection data={tools} />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6128301546730956"
          crossOrigin="anonymous"></script>
        <ins className="adsbygoogle"
          style={{ 'display': 'block' }}
          data-ad-client="ca-pub-6128301546730956"
          data-ad-slot="2810295936"
          data-ad-format="auto"
          data-full-width-responsive="true"></ins>
        <script>
          {`(adsbygoogle = window.adsbygoogle || []).push({ });`}
        </script>
      </Layout>
    </>
  )
}


export const getStaticProps: GetStaticProps = async (context) => {
  const tools: ToolData[] = listMatchedTools('');
  return {
    props: {
      tools,
    }
  }
}
