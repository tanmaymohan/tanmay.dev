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
      <Translate id="homepage.caseStudies.costOptimization.title">
        $20K/Year Cloud Cost Reduction
      </Translate>
    ),
    Icon: IconCaseStudy,
    description: (
      <Translate id="homepage.caseStudies.costOptimization.description">
        8 learnings from production: pod packing, GPU right-sizing, Spot, Savings Plans, RIs, database migration, storage cleanup, service deprecation.
      </Translate>
    ),
    link: '/blog/cost-optimization-journey',
    tags: ['FinOps', 'Kubernetes', 'AWS', 'GPU'],
    metric: '$1,800/mo saved',
  },
  {
    title: (
      <Translate id="homepage.caseStudies.eksHardening.title">
        EKS Hardened in 4 Weeks
      </Translate>
    ),
    Icon: IconCaseStudy,
    description: (
      <Translate id="homepage.caseStudies.eksHardening.description">
        Bottlerocket nodes, private API, IRSA migration, SonarCloud SAST, Trivy scanning, AWS WAF, branch protection — VAPT-ready.
      </Translate>
    ),
    link: '/blog/hardening-eks-stack-6-months',
    tags: ['Security', 'Kubernetes', 'AWS', 'Compliance'],
    metric: 'VAPT passed',
  },
  {
    title: (
      <Translate id="homepage.caseStudies.gpuMigration.title">
        4 GPU Workloads Migrated GCP→AWS
      </Translate>
    ),
    Icon: IconCaseStudy,
    description: (
      <Translate id="homepage.caseStudies.gpuMigration.description">
        Whisper (Triton + TensorRT-LLM), Triton Inference Server, SD3, vLLM — containerized, Karpenter-managed, internal ALB ingress.
      </Translate>
    ),
    link: '/blog/migrating-gpu-workloads-across-clouds',
    tags: ['Migration', 'GPU', 'Kubernetes', 'MLOps'],
    metric: '4 weeks',
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

function CaseStudy({Icon, title, description, link, tags, metric}) {
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
          {link && (
            <Link
              className="button button--secondary button--outline"
              to={link}
              style={{marginTop: '1rem', display: 'inline-block'}}>
              <Translate id="homepage.caseStudies.readCaseStudy">Read Case Study →</Translate>
            </Link>
          )}
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