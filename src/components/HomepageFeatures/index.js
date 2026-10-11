import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

// On-brand icons
const IconCaseStudy = ({className}) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
    <rect x="8" y="12" width="48" height="40" rx="3" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M20 24h24M20 32h18M20 40h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M36 20v24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconCloud = ({className}) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
    <path d="M48 36c.6 0 1.2-.1 1.8-.2A10 10 0 0 0 38 18a10 10 0 0 0-9.6 7.2 6 6 0 0 0-4.4 10.4 6 6 0 0 0 4.4 2.4H48Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 44H8a6 6 0 0 1 0-12h2a8 8 0 0 1 14-4 8 8 0 0 1 14 4h2a6 6 0 0 1 0 12h-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconGpu = ({className}) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
    <rect x="12" y="16" width="40" height="32" rx="2" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M20 24h6v4h-6zM30 24h6v4h-6zM20 32h6v4h-6zM30 32h6v4h-6z" fill="currentColor" opacity="0.8"/>
    <path d="M12 28h8M44 28h8M32 48v6M32 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CaseStudyList = [
  {
    title: (
      <Translate id="homepage.caseStudies.scaleToZero.title">
        Scale-to-Zero GPU at 116 GPUs
      </Translate>
    ),
    Icon: IconCaseStudy,
    description: (
      <Translate id="homepage.caseStudies.scaleToZero.description">
        Karpenter + KEDA HTTP add-on + metrics-api across 5 model types (LLM, embedding, OCR, vision, multimodal). $0 idle, 116 GPUs including 55× RTX PRO 6000 Blackwell.
      </Translate>
    ),
    link: '/blog/scale-to-zero-mlops-on-eks',
    tags: ['MLOps', 'GPU', 'Kubernetes', 'KEDA', 'Karpenter'],
    metric: '$0 idle / 116 GPUs',
    codeUrl: 'https://github.com/tanmaymohan/gpu-scale-to-zero',
  },
  {
    title: (
      <Translate id="homepage.caseStudies.nvidiaFix.title">
        NVIDIA Container Toolkit Regression Fix
      </Translate>
    ),
    Icon: IconCaseStudy,
    description: (
      <Translate id="homepage.caseStudies.nvidiaFix.description">
        Found and fixed a regression in NVIDIA Container Toolkit 1.20.0 breaking GPU detection on EKS Bottlerocket. Filed issue, minimal repro, fix merged in 1.20.1.
      </Translate>
    ),
    link: '/blog/nvidia-container-toolkit-regression-fix',
    tags: ['Open Source', 'GPU', 'Kubernetes', 'EKS', 'Debugging'],
    metric: 'Fixed in 1.20.1',
    codeUrl: 'https://github.com/nvidia/container-toolkit/pull/2851',
  },
  {
    title: (
      <Translate id="homepage.caseStudies.coldStarts.title">
        Cutting GPU Cold Starts: 54% Faster
      </Translate>
    ),
    Icon: IconCaseStudy,
    description: (
      <Translate id="homepage.caseStudies.coldStarts.description">
        Benchmarked NVMe, Bottlerocket, SOCI lazy loading, parallel pulls, FastImagePull, EBS throughput. Best: 43s (54% faster) with AL2023 FastImagePull + 600 MiB/s EBS.
      </Translate>
    ),
    link: '/blog/cutting-gpu-cold-starts-on-eks',
    tags: ['GPU', 'Kubernetes', 'EKS', 'Performance', 'Containers'],
    metric: '43s pull (54% faster)',
    codeUrl: 'https://github.com/tanmaymohan/gpu-cold-start-bench',
  },
];

const FeatureList = [
  {
    title: (
      <Translate id="homepage.features.runningGpus.title">
        Running GPUs in 2026
      </Translate>
    ),
    Icon: IconGpu,
    description: (
      <Translate id="homepage.features.runningGpus.description">
        6 provider guides: Brev, Verda, E2E, AWS, GCP, Local. Compare GPUs, pricing, setup, and use cases.
      </Translate>
    ),
    link: '/docs/running-gpus-in-2026',
  },
  {
    title: (
      <Translate id="homepage.features.costPlaybook.title">
        Cost Optimization Playbook
      </Translate>
    ),
    Icon: IconCloud,
    description: (
      <Translate id="homepage.features.costPlaybook.description">
        Systematic AWS cost reduction: Compute, Database, Storage, Networking, Monitoring. Not tips — a framework.
      </Translate>
    ),
    link: '/docs/cost-optimization-playbook',
  },
];

function CaseStudy({Icon, title, description, link, tags, metric, codeUrl}) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.caseStudyCard}>
        <div className={styles.iconWrap}>
          <Icon className={styles.featureSvg} />
        </div>
        <div className={styles.caseStudyContent}>
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
          <div className={styles.tags}>
            {tags.map((tag, i) => (
              <span key={i} className={styles.tag}>{tag}</span>
            ))}
          </div>
          <div className={styles.metric}>{metric}</div>
          <div className={styles.linkRow} style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center'}}>
            {link && (
              <Link
                className="button button--secondary button--outline"
                to={link}
                style={{display: 'inline-block'}}>
                <Translate id="homepage.caseStudies.readCaseStudy">Read Case Study →</Translate>
              </Link>
            )}
            {codeUrl && (
              <a
                className="button button--outline button--secondary"
                href={codeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{display: 'inline-block'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '0.4rem', verticalAlign: 'middle'}} aria-hidden="true">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                Code
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({Icon, title, description, link}) {
  return (
    <div className={clsx('col col--6')}>
      <div className={styles.iconWrap}>
        <Icon className={styles.featureSvg} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        {link && (
          <Link
            className="button button--secondary button--outline"
            to={link}
            style={{marginTop: '1rem'}}>
            <Translate id="homepage.features.learnMore">Explore Guide →</Translate>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <>
      <section className={styles.caseStudies}>
        <div className="container">
          <div className="text--center" style={{marginBottom: '2rem'}}>
            <Heading as="h2" style={{marginBottom: '0.5rem'}}>
              <Translate id="homepage.caseStudies.heading">Featured Case Studies</Translate>
            </Heading>
            <p className={styles.subtitle}>
              <Translate id="homepage.caseStudies.subtitle">Real production work with measurable outcomes</Translate>
            </p>
          </div>
          <div className="row">
            {CaseStudyList.map((props, idx) => (
              <CaseStudy key={idx} {...props} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className="container">
          <div className="text--center" style={{marginBottom: '2rem'}}>
            <Heading as="h2" style={{marginBottom: '0.5rem'}}>
              <Translate id="homepage.features.docsHeading">Documentation Guides</Translate>
            </Heading>
            <p className={styles.subtitle}>
              <Translate id="homepage.features.docsSubtitle">Comprehensive, step-by-step references</Translate>
            </p>
          </div>
          <div className="row">
            {FeatureList.map((props, idx) => (
              <Feature key={idx} {...props} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}