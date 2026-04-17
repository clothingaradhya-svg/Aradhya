import { useEffect } from 'react';
import { buildCanonicalUrl, createKeywordList, SITE_NAME, SITE_URL } from '../lib/seo';

const upsertMetaTag = (selector, attributes, content) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
};

const upsertLinkTag = (selector, attributes, href) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
};

const upsertStructuredData = (data) => {
  const scriptId = 'seo-structured-data';
  let element = document.head.querySelector(`#${scriptId}`);

  if (!data) {
    if (element) {
      element.remove();
    }
    return;
  }

  if (!element) {
    element = document.createElement('script');
    element.id = scriptId;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
};

const SeoHead = ({
  title,
  description,
  keywords = [],
  canonicalPath = '/',
  type = 'website',
  image = `${SITE_URL}/aradhya-logo.png`,
  structuredData = null,
  noIndex = false,
}) => {
  useEffect(() => {
    const finalTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const finalDescription = description || `${SITE_NAME} men's designer wear in India.`;
    const finalKeywords = createKeywordList(keywords);
    const canonicalUrl = buildCanonicalUrl(canonicalPath);

    document.title = finalTitle;

    upsertMetaTag('meta[name="description"]', { name: 'description' }, finalDescription);
    upsertMetaTag('meta[name="keywords"]', { name: 'keywords' }, finalKeywords.join(', '));
    upsertMetaTag(
      'meta[name="robots"]',
      { name: 'robots' },
      noIndex ? 'noindex, nofollow' : 'index, follow',
    );

    upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, finalTitle);
    upsertMetaTag(
      'meta[property="og:description"]',
      { property: 'og:description' },
      finalDescription,
    );
    upsertMetaTag('meta[property="og:type"]', { property: 'og:type' }, type);
    upsertMetaTag('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMetaTag('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image' }, image);

    upsertMetaTag(
      'meta[name="twitter:card"]',
      { name: 'twitter:card' },
      'summary_large_image',
    );
    upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title' }, finalTitle);
    upsertMetaTag(
      'meta[name="twitter:description"]',
      { name: 'twitter:description' },
      finalDescription,
    );
    upsertMetaTag('meta[name="twitter:image"]', { name: 'twitter:image' }, image);

    upsertLinkTag('link[rel="canonical"]', { rel: 'canonical' }, canonicalUrl);
    upsertStructuredData(structuredData);
  }, [canonicalPath, description, image, keywords, noIndex, structuredData, title, type]);

  return null;
};

export default SeoHead;
