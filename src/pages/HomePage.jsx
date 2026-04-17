import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroWith3D from '../components/HeroWith3D';
import SkintoneSelector from '../components/SkintoneSelector';
import OccasionSelector from '../components/OccasionSelector';
import ProductGrid from '../components/ProductGrid';
import VideoBanner from '../components/VideoBanner';
import TypewriterSearch from '../components/TypewriterSearch';
import SeoHead from '../components/SeoHead';
import { blogArticles } from '../content/blogArticles';
import { useCatalog } from '../contexts/catalog-context';
import { fetchHomepageProducts, toProductCard } from '../lib/api';
import { TARGET_KEYWORDS } from '../lib/seo';
import heroVideo from '../assets/Coin_in_Nature_Climate_Video.mp4';

const PRIMARY_HANDLE = import.meta.env.VITE_HOME_PRIMARY_COLLECTION ?? null;
const SECONDARY_HANDLE = import.meta.env.VITE_HOME_SECONDARY_COLLECTION ?? null;

export default function HomePage() {
  const { products: catalogProducts, ensureCollectionProducts } = useCatalog();
  const [latestProducts, setLatestProducts] = useState([]);
  const [moreProducts, setMoreProducts] = useState([]);
  const [latestTitle, setLatestTitle] = useState('Special Products');
  const [moreTitle, setMoreTitle] = useState('Most Selling Products');
  const [latestLoading, setLatestLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(true);
  const [selectedSkintone, setSelectedSkintone] = useState(null);

  const handleSkintoneScroll = () => {
    document.getElementById('skintone-selector')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to occasion selector when skintone is selected
  useEffect(() => {
    if (selectedSkintone) {
      document.getElementById('occasion-selector')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedSkintone]);

  const fallbackLatest = useMemo(() => {
    if (!catalogProducts?.length) return [];
    return catalogProducts
      .slice(0, 4)
      .map((product) => toProductCard(product))
      .filter(Boolean);
  }, [catalogProducts]);

  const fallbackMore = useMemo(() => {
    if (!catalogProducts?.length) return [];
    return catalogProducts
      .slice(4, 8)
      .map((product) => toProductCard(product))
      .filter(Boolean);
  }, [catalogProducts]);

  useEffect(() => {
    let cancelled = false;

    async function loadPrimary() {
      const _t0 = performance.now();
      console.log('%c[HomePage] ⏳ Loading "Latest Drop" section...', 'color:#ec4899;font-weight:bold');
      setLatestLoading(true);
      if (!PRIMARY_HANDLE) {
        try {
          const response = await fetchHomepageProducts('featured', 4);
          if (cancelled) return;
          setLatestTitle(response.title || 'Special Products');
          setLatestProducts(
            response.items.length
              ? response.items.map((item) => toProductCard(item)).filter(Boolean)
              : fallbackLatest,
          );
          return;
        } catch (error) {
          console.warn('Failed to load featured homepage products', error);
          setLatestProducts(fallbackLatest);
          setLatestLoading(false);
          return;
        }
      }
      try {
        const response = await fetchHomepageProducts('featured', 4);
        if (cancelled) return;
        setLatestTitle(response.title || 'Special Products');
        if (response.items?.length) {
          setLatestProducts(response.items.map((item) => toProductCard(item)).filter(Boolean));
        } else {
          const collectionProducts = await ensureCollectionProducts(PRIMARY_HANDLE, { limit: 4 });
          if (cancelled) return;
          if (collectionProducts?.length) {
            setLatestProducts(collectionProducts.map((item) => toProductCard(item)).filter(Boolean));
          } else {
            setLatestProducts(fallbackLatest);
          }
        }
      } catch (error) {
        console.warn('Failed to load featured homepage products', error);
        if (!cancelled) {
          try {
            const collectionProducts = await ensureCollectionProducts(PRIMARY_HANDLE, { limit: 4 });
            if (cancelled) return;
            if (collectionProducts?.length) {
              setLatestProducts(collectionProducts.map((item) => toProductCard(item)).filter(Boolean));
            } else {
              setLatestProducts(fallbackLatest);
            }
          } catch (collectionError) {
            console.warn(`Failed to load collection "${PRIMARY_HANDLE}"`, collectionError);
            setLatestProducts(fallbackLatest);
          }
        }
      } finally {
        if (!cancelled) {
          const _dur = (performance.now() - _t0).toFixed(0);
          console.log(`%c[HomePage] ✅ "Latest Drop" ready in ${_dur}ms`, _dur > 2000 ? 'color:#ef4444;font-weight:bold' : 'color:#22c55e;font-weight:bold');
          setLatestLoading(false);
        }
      }
    }

    loadPrimary();

    return () => {
      cancelled = true;
    };
  }, [fallbackLatest, ensureCollectionProducts]);

  useEffect(() => {
    let cancelled = false;

    async function loadSecondary() {
      const _t0 = performance.now();
      console.log('%c[HomePage] ⏳ Loading "More From ARADHYA" section...', 'color:#ec4899;font-weight:bold');
      setMoreLoading(true);
      if (!SECONDARY_HANDLE) {
        try {
          const response = await fetchHomepageProducts('bestSeller', 4);
          if (cancelled) return;
          setMoreTitle(response.title || 'Most Selling Products');
          setMoreProducts(
            response.items.length
              ? response.items.map((item) => toProductCard(item)).filter(Boolean)
              : fallbackMore,
          );
          return;
        } catch (error) {
          console.warn('Failed to load best seller homepage products', error);
          setMoreProducts(fallbackMore);
          setMoreLoading(false);
          return;
        }
      }
      try {
        const response = await fetchHomepageProducts('bestSeller', 4);
        if (cancelled) return;
        setMoreTitle(response.title || 'Most Selling Products');
        if (response.items?.length) {
          setMoreProducts(response.items.map((item) => toProductCard(item)).filter(Boolean));
        } else {
          const collectionProducts = await ensureCollectionProducts(SECONDARY_HANDLE, { limit: 4 });
          if (cancelled) return;
          if (collectionProducts?.length) {
            setMoreProducts(collectionProducts.map((item) => toProductCard(item)).filter(Boolean));
          } else {
            setMoreProducts(fallbackMore);
          }
        }
      } catch (error) {
        console.warn('Failed to load best seller homepage products', error);
        if (!cancelled) {
          try {
            const collectionProducts = await ensureCollectionProducts(SECONDARY_HANDLE, { limit: 4 });
            if (cancelled) return;
            if (collectionProducts?.length) {
              setMoreProducts(collectionProducts.map((item) => toProductCard(item)).filter(Boolean));
            } else {
              setMoreProducts(fallbackMore);
            }
          } catch (collectionError) {
            console.warn(`Failed to load collection "${SECONDARY_HANDLE}"`, collectionError);
            setMoreProducts(fallbackMore);
          }
        }
      } finally {
        if (!cancelled) {
          const _dur = (performance.now() - _t0).toFixed(0);
          console.log(`%c[HomePage] ✅ "More From ARADHYA" ready in ${_dur}ms`, _dur > 2000 ? 'color:#ef4444;font-weight:bold' : 'color:#22c55e;font-weight:bold');
          setMoreLoading(false);
        }
      }
    }

    loadSecondary();

    return () => {
      cancelled = true;
    };
  }, [fallbackMore, ensureCollectionProducts]);

  return (
    <div className="home-page">
      <SeoHead
        title="Aradhya Designer Wear for Men in India"
        description="Shop Aradhya designer wear with men outfit combination ideas, skintone based outfit combinations for men, old money styling, and premium men outfit under 2500 inspiration."
        keywords={[
          TARGET_KEYWORDS[0],
          TARGET_KEYWORDS[1],
          TARGET_KEYWORDS[2],
          TARGET_KEYWORDS[3],
          TARGET_KEYWORDS[13],
        ]}
        canonicalPath="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Aradhya designer wear for men',
          description:
            'Aradhya designer wear for men in India with outfit combinations by skin tone, occasion, and budget.',
        }}
      />

      <div className="relative">
        <div className="absolute left-0 top-3 z-40 w-full px-4 lg:hidden">
          <TypewriterSearch onSearchClick={() => document.dispatchEvent(new CustomEvent('open-search'))} />
        </div>

        <HeroWith3D
          heroVideoSrc={heroVideo}
          ctaLabel="Select Skintone"
          onCtaClick={handleSkintoneScroll}
        />
      </div>

      <section className="site-shell py-10 md:py-14">
        <div className="mx-auto max-w-4xl space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">
            Men&apos;s Designer Wear
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Aradhya Designer Wear for Men in India
          </h1>
          <p className="text-sm leading-7 text-gray-600 md:text-base">
            Explore Aradhya designer wear for elevated men outfit combination ideas, from
            skintone based outfit combinations for men to old money outfits for men in India.
            Whether you want a sharp party look, a polished date outfit, or a men outfit under
            2500, our collections are designed to make premium styling feel effortless.
          </p>
        </div>
      </section>

      <div id="skintone-selector" className="site-shell pb-4 pt-6 md:pb-6 md:pt-8">
        <SkintoneSelector onSelect={setSelectedSkintone} />
      </div>

      {selectedSkintone && (
        <div id="occasion-selector">
          <OccasionSelector selectedSkintone={selectedSkintone} />
        </div>
      )}

      <ProductGrid
        title={latestTitle}
        products={latestProducts}
        ctaHref="/products?category=t-shirts"
        ctaLabel="Shop Now"
        loading={latestLoading}
        enableImageScroller
      />

      <VideoBanner />

      <ProductGrid
        title={moreTitle}
        products={moreProducts}
        ctaHref="/products"
        ctaLabel="View All"
        loading={moreLoading}
        enableImageScroller
      />

      <section className="site-shell pb-16 pt-4 md:pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">
              Men&apos;s Fashion Guides for India
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Read styling guides on the best colour combination for men, occasion-ready looks,
              and skintone-based outfit ideas tailored to Indian menswear.
            </p>
          </div>
          <Link to="/blog" className="text-sm font-semibold text-slate-900 underline underline-offset-4">
            View all articles
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {blogArticles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="group flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                Style Guide
              </p>
              <h3 className="mt-3 text-lg font-semibold text-slate-950 transition group-hover:text-slate-700">
                {article.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{article.excerpt}</p>
              <span className="mt-5 text-sm font-semibold text-slate-900">
                Read article
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
