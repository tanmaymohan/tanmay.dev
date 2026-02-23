import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

// On-brand icons (no Docusaurus defaults): cloud, GPU/tech, journey
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
const IconJourney = ({className}) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
    <path d="M8 48c8-12 16-20 24-24 8-4 16-4 24 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 48c0 4 4 8 8 8s8-4 8-8-4-8-8-8-8 4-8 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32 24c0 4 4 8 8 8s8-4 8-8-4-8-8-8-8 4-8 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M56 8c0 4 4 8 8 8s8-4 8-8-4-8-8-8-8 4-8 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FeatureList = [
  {
    title: (
      <Translate id="homepage.features.cloudInfra.title">
        Cloud Infrastructure
      </Translate>
    ),
    Icon: IconCloud,
    description: (
      <Translate id="homepage.features.cloudInfra.description">
        Explore articles on cloud computing, infrastructure optimization, and
        best practices for running workloads efficiently in the cloud.
      </Translate>
    ),
    link: '/docs/running-gpus-in-2026',
  },
  {
    title: (
      <Translate id="homepage.features.technicalInsights.title">
        Technical Insights
      </Translate>
    ),
    Icon: IconGpu,
    description: (
      <Translate id="homepage.features.technicalInsights.description">
        Deep dives into GPU workloads, cost optimization, and technical
        solutions for latency-sensitive environments.
      </Translate>
    ),
    link: '/blog',
  },
  {
    title: (
      <Translate id="homepage.features.learningJourney.title">
        Learning Journey
      </Translate>
    ),
    Icon: IconJourney,
    description: (
      <Translate id="homepage.features.learningJourney.description">
        Sharing knowledge and experiences from the journey of a cloud physicist,
        documenting discoveries and solutions along the way.
      </Translate>
    ),
    link: '/blog',
  },
];

function Feature({Icon, title, description, link}) {
  return (
    <div className={clsx('col col--4')}>
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
            <Translate id="homepage.features.learnMore">Learn More →</Translate>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
