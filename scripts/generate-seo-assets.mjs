import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { blogArticles } from '../src/content/blogArticles.js';
import { SITE_URL } from '../src/lib/seo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

const API_BASE = (process.env.SEO_API_BASE_URL || SITE_URL).replace(/\/+$/, '');
const PAGE_SIZE = 200;

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/products', changefreq: 'daily', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/cancel-refund-exchange', changefreq: 'monthly', priority: '0.4' },
  { path: '/legal/privacy-policy', changefreq: 'monthly', priority: '0.3' },
  { path: '/legal/terms-of-use', changefreq: 'monthly', priority: '0.3' },
  { path: '/legal/refund-return-policy', changefreq: 'monthly', priority: '0.3' },
  { path: '/legal/cookie-policy', changefreq: 'monthly', priority: '0.3' },
];

const toAbsoluteUrl = (pathname) => new URL(pathname, SITE_URL).toString();

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

async function fetchAllProducts() {
  const items = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (items.length < total) {
    const url = `${API_BASE}/api/products?limit=${PAGE_SIZE}&page=${page}&include=compact`;
    const payload = await fetchJson(url);
    const batch = Array.isArray(payload?.data) ? payload.data : [];
    const metaTotal = Number(payload?.meta?.total);

    if (Number.isFinite(metaTotal) && metaTotal > 0) {
      total = metaTotal;
    }

    items.push(...batch);

    if (!batch.length || batch.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return items;
}

async function fetchAllCollections() {
  const items = [];
  let page = 1;

  while (true) {
    const url = `${API_BASE}/api/collections?limit=${PAGE_SIZE}&page=${page}`;
    const payload = await fetchJson(url);
    const batch = Array.isArray(payload?.data) ? payload.data : [];

    items.push(...batch);

    if (!batch.length || batch.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return items;
}

function createSitemapXml(urls) {
  const body = urls
    .map((entry) => {
      const parts = [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
      ];

      if (entry.lastmod) {
        parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      }

      if (entry.changefreq) {
        parts.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
      }

      if (entry.priority) {
        parts.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
      }

      parts.push('  </url>');
      return parts.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function createRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nDisallow: /admin\nDisallow: /admin/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /checkout/\nDisallow: /login\nDisallow: /register\nDisallow: /profile\nDisallow: /wishlist\nDisallow: /search\nDisallow: /*?*sort=\nDisallow: /*?*utm_\nDisallow: /*?*fbclid=\nDisallow: /*?*gclid=\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function main() {
  const urls = [];
  const seen = new Set();

  const register = (entry) => {
    if (!entry?.loc || seen.has(entry.loc)) return;
    seen.add(entry.loc);
    urls.push(entry);
  };

  STATIC_ROUTES.forEach((route) => {
    register({
      loc: toAbsoluteUrl(route.path),
      changefreq: route.changefreq,
      priority: route.priority,
    });
  });

  blogArticles.forEach((article) => {
    register({
      loc: toAbsoluteUrl(`/blog/${article.slug}`),
      changefreq: 'monthly',
      priority: '0.6',
    });
  });

  try {
    const [products, collections] = await Promise.all([
      fetchAllProducts(),
      fetchAllCollections(),
    ]);

    collections.forEach((collection) => {
      if (!collection?.handle) return;
      register({
        loc: toAbsoluteUrl(`/collections/${collection.handle}`),
        lastmod: normalizeDate(collection.updatedAt || collection.publishedAt),
        changefreq: 'weekly',
        priority: collection.parentId ? '0.6' : '0.7',
      });
    });

    products.forEach((product) => {
      if (!product?.handle) return;
      register({
        loc: toAbsoluteUrl(`/product/${product.handle}`),
        lastmod: normalizeDate(product.updatedAt || product.publishedAt),
        changefreq: 'weekly',
        priority: '0.8',
      });
    });
  } catch (error) {
    console.warn(`[seo] Unable to fully hydrate sitemap from API: ${error.message}`);
  }

  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), createSitemapXml(urls), 'utf8');
  await fs.writeFile(path.join(publicDir, 'robots.txt'), createRobotsTxt(), 'utf8');

  console.log(`[seo] Generated sitemap.xml with ${urls.length} URLs`);
  console.log('[seo] Generated robots.txt');
}

main().catch((error) => {
  console.error('[seo] Failed to generate SEO assets', error);
  process.exitCode = 1;
});
