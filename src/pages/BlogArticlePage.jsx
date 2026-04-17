import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SeoHead from '../components/SeoHead';
import { blogArticlesBySlug, blogArticles } from '../content/blogArticles';

const BlogArticlePage = () => {
  const { slug } = useParams();
  const article = blogArticlesBySlug[slug];

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const relatedArticles = blogArticles.filter((entry) => entry.slug !== article.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f8f8f6] pt-24 pb-16">
      <SeoHead
        title={article.title}
        description={article.description}
        keywords={article.keywords}
        canonicalPath={`/blog/${article.slug}`}
        type="article"
        image={`https://www.thehouseofaradhya.com${article.coverImage}`}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          image: `https://www.thehouseofaradhya.com${article.coverImage}`,
          author: {
            '@type': 'Organization',
            name: 'Aradhya',
          },
          publisher: {
            '@type': 'Organization',
            name: 'Aradhya',
          },
          mainEntityOfPage: `https://www.thehouseofaradhya.com/blog/${article.slug}`,
        }}
      />

      <div className="site-shell max-w-4xl">
        <div className="mb-6 text-xs uppercase tracking-[0.25em] text-neutral-500">
          <Link to="/blog" className="hover:text-black">Blog</Link> / {article.title}
        </div>

        <article className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
          <img
            src={article.coverImage}
            alt={article.coverAlt}
            className="h-64 w-full object-cover md:h-80"
            loading="eager"
          />

          <div className="space-y-8 px-6 py-8 md:px-10 md:py-10">
            <header className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                Men&apos;s Designer Wear Guide
              </p>
              <h1 className="text-3xl font-bold leading-tight text-neutral-900 md:text-5xl">
                {article.title}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-neutral-600 md:text-lg">
                {article.description}
              </p>
            </header>

            <div className="space-y-8">
              {article.sections.map((section) => (
                <section key={section.heading} className="space-y-4">
                  <h2 className="text-2xl font-semibold text-neutral-900">{section.heading}</h2>
                  <div className="space-y-4 text-base leading-7 text-neutral-700">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </article>

        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-neutral-900">More Style Guides</h2>
            <Link to="/blog" className="text-sm font-semibold text-neutral-700 underline hover:text-black">
              View all
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {relatedArticles.map((entry) => (
              <Link
                key={entry.slug}
                to={`/blog/${entry.slug}`}
                className="overflow-hidden rounded-3xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
              >
                <img
                  src={entry.coverImage}
                  alt={entry.coverAlt}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
                <div className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
                    Aradhya Blog
                  </p>
                  <h3 className="text-lg font-semibold text-neutral-900">{entry.title}</h3>
                  <p className="text-sm leading-6 text-neutral-600">{entry.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BlogArticlePage;
