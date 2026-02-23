import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, {translate} from '@docusaurus/Translate';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroOverlay} />
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <span className={styles.badge}>
            <Translate id="homepage.hero.badge">Cloud Physicist</Translate>
          </span>
          <Heading as="h1" className={styles.heroTitle}>
            <Translate id="homepage.hero.greeting">Hi, I'm Tanmay</Translate>
          </Heading>
          <p className={styles.heroSubtitle}>
            <Translate id="homepage.hero.subtitle">
              I write about cloud infrastructure, GPU workloads, and cost
              optimization. Welcome to my corner of the internet.
            </Translate>
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/blog">
              <Translate id="homepage.hero.readBlog">Read My Blog</Translate>
            </Link>
            <Link
              className="button button--outline button--secondary button--lg"
              to="/docs/running-gpus-in-2026">
              <Translate id="homepage.hero.exploreDocs">Explore Docs</Translate>
            </Link>
          </div>
        </div>
        <div className={styles.heroImageCol}>
          <img
            src="/img/author.jpg"
            alt="Tanmay Mohan"
            className={styles.heroAvatar}
            width="260"
            height="260"
          />
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={translate({
        id: 'homepage.meta.title',
        message: 'Tanmay.dev — Cloud Physicist',
      })}
      description={translate({
        id: 'homepage.meta.description',
        message:
          'Tanmay Mohan — cloud physicist writing about GPU workloads, cloud infrastructure, cost optimization, and AI/ML. Guides for running GPUs on AWS, GCP, Brev, Verda, and E2E Networks.',
      })}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
