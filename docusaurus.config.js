// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Tanmay Mohan — Senior Platform Engineer, GPU inference on EKS',
  tagline: 'Journey of a cloud physicist',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://tanmay.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',
  // Index pages live at /docs/section/. Without the slash, links like ./compute
  // resolve to /docs/compute and 404 even though the child page exists.
  trailingSlash: true,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'tanmaymohan', // Usually your GitHub org/user name.
  projectName: 'tanmay-dev-blog', // Usually your repo name.

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  headTags: [
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Tanmay Mohan',
        url: 'https://tanmay.dev',
        jobTitle: 'Cloud Physicist',
        sameAs: [
          'https://tanmaymohan.com',
          'https://github.com/tanmaymohan',
          'https://www.linkedin.com/in/tanmaymohan/',
        ],
      }),
    },
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 'ALL',
          blogSidebarTitle: 'All posts',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // SEO: generate meta tags from frontmatter
          blogTitle: 'Tanmay.dev Blog',
          blogDescription: 'Cloud infrastructure, GPU workloads, cost optimization, and AI/ML by Tanmay Mohan (Cloud Physicist). Practical guides for running GPUs on AWS, GCP, Brev, Verda, E2E Networks, and EKS hardening.',
          postsPerPage: 10,
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.7,
          ignorePatterns: ['/tags/**', '/archive/**'],
          filename: 'sitemap.xml',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/author.jpg',
      metadata: [
        {name: 'keywords', content: 'Senior Platform Engineer, GPU inference, EKS, Kubernetes, AWS, MLOps, LLMOps, Karpenter, KEDA, cost optimization, cloud infrastructure'},
        {name: 'author', content: 'Tanmay Mohan'},
        {name: 'description', content: 'Tanmay Mohan — Senior Platform Engineer specializing in GPU inference on EKS, Kubernetes, and cloud cost optimization. 116 GPUs at $0 idle, 54% faster cold starts, 71% Langfuse cost reduction.'},
        {property: 'og:site_name', content: 'Tanmay.dev'},
        {property: 'og:type', content: 'website'},
        {property: 'og:locale', content: 'en'},
        {property: 'og:locale:alternate', content: 'hi'},
        {name: 'twitter:card', content: 'summary_large_image'},
        {name: 'twitter:site', content: '@tanmaymohan'},
        {name: 'twitter:creator', content: '@tanmaymohan'},
      ],
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Tanmay.dev',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/tanmaymohan',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Links',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'About',
                to: '/about',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/tanmaymohan',
              },
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/in/tanmaymohan/',
              },
              {
                label: 'Portfolio',
                href: 'https://tanmaymohan.com',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Tanmay.dev by Tanmay Mohan. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
