# SEO Optimization Report

Website audited: `https://www.thehouseofaradhya.com/`

Audit date: April 23, 2026

## 1. Audit Report

### Executive Summary

The current live website does not match the business positioning in your brief.

- The live domain currently presents itself as a men's designer wear store, not an Indian artificial jewellery store.
- The raw HTML response for `/`, `/products`, and `/product/maroon-shirt` is mostly the same SPA shell, which weakens crawlability and reduces control over how Google sees page-level metadata before rendering.
- The existing `robots.txt` and `sitemap.xml` were outdated and referenced old route patterns that no longer reflect the live inventory structure.
- The site ships heavy JavaScript and multiple autoplay videos, which can hurt Core Web Vitals, especially on Indian mobile traffic.

### High-Priority Findings

#### On-page SEO issues

- Homepage, collection, product, and blog copy are still centered on men's fashion keywords.
- Product titles and descriptions are not aligned with your stated target keywords such as `artificial jewellery India`, `imitation jewellery online`, `bridal jewellery artificial`, and `luxury artificial jewellery`.
- Category pages do not have strong static introductory copy blocks for SEO.
- Product pages rely mostly on product title plus short description text and do not build enough semantic depth around material, occasion, style, gifting, bridal, or regional intent.
- The raw HTML shell had no strong default Open Graph or Twitter metadata.
- `meta keywords` existed, but Google does not use that tag as a ranking signal.

#### Technical SEO issues

- The site is a client-rendered React SPA. Google can render JavaScript, but Search Central still recommends server-side rendering or pre-rendering because it is faster and more reliable for users and crawlers.
- Raw source responses lacked stable canonical, Open Graph, Twitter, and structured data coverage across routes before client hydration.
- Filtered pages were producing duplicate-content risk through query-string variants.
- `robots.txt` had WordPress-specific directives that do not fit this stack.
- `sitemap.xml` was static, stale, and missing real products and collections.
- Product structured data existed only in a minimal form and did not include breadcrumb or organization context.

#### UX and CRO issues affecting SEO

- Heavy above-the-fold video and a large JS app shell slow first interaction.
- Collection pages depend on filters more than on permanent indexable landing pages.
- Trust signals are weak for ecommerce: limited visible review proof, shipping assurance, return messaging, and payment confidence blocks.
- Product pages can do more to surface urgency, social proof, occasion fit, and related products.

#### Mobile issues

- Mobile-first traffic is likely the majority for this category in India, but large autoplay media and client-side rendering can slow low-to-mid-range devices.
- Crawlable, text-rich page content is not consistently visible in the initial response.
- Listing filters are usable, but indexable landing pages should rely on clean URLs instead of parameter-heavy states.

#### Page speed issues

- Pre-change production build shipped a single main JS bundle around `957 KB` uncompressed.
- The home experience includes a hero video around `1.3 MB` and a banner video around `876 KB`.
- Several PNG assets exceed `190 KB`.
- Large app shell plus media-heavy layout can delay LCP and interaction readiness.

#### Missing or weak metadata

- Missing canonical and social tags in raw HTML before hydration.
- Limited image alt text quality in product cards and detail views.
- No strong brand-level metadata in the base `index.html`.

#### Missing or weak schema markup

- Product markup existed, but breadcrumb and organization schema were not consistently present.
- Listing pages did not expose clean `CollectionPage` plus `ItemList` context.
- Blog pages lacked organization and breadcrumb reinforcement.

### Business Blocker

If the brand goal is now artificial jewellery, the site must be repositioned at both catalog and copy level. Ranking a men's fashion storefront for jewellery intent will be extremely difficult because:

- page copy does not match jewellery queries,
- product taxonomy does not match jewellery intent,
- collection names do not match jewellery categories,
- Google will see entity mismatch between content and keywords.

## 2. Keyword Mapping

Use this mapping if the storefront is being repositioned to artificial jewellery.

| Page | Primary keyword | Secondary keywords | Search intent |
| --- | --- | --- | --- |
| Home | artificial jewellery India | imitation jewellery online, luxury artificial jewellery | Commercial |
| `/collections/bridal-jewellery` | bridal jewellery artificial | bridal imitation jewellery, bridal jewellery set online | Transactional |
| `/collections/necklace-sets` | imitation jewellery necklace set | artificial necklace set, party wear necklace set | Transactional |
| `/collections/earrings` | artificial earrings online | statement earrings India, party wear earrings | Transactional |
| `/collections/bangles` | artificial bangles online | bridal bangles set, traditional bangles India | Transactional |
| `/collections/rings` | artificial rings for women | cocktail rings online, adjustable rings India | Transactional |
| `/collections/kundan-jewellery` | kundan artificial jewellery | kundan necklace set, kundan earrings | Transactional |
| `/collections/polki-jewellery` | polki artificial jewellery | polki necklace set, bridal polki jewellery | Transactional |
| `/collections/oxidised-jewellery` | oxidised jewellery online | oxidised earrings India, oxidised necklace set | Transactional |
| `/collections/jewellery-under-999` | artificial jewellery under 999 | budget imitation jewellery, affordable jewellery India | Price-led commercial |
| `/product/<slug>` | product-specific keyword | brand + style + occasion + material | Transactional |
| `/blog/how-to-style-artificial-jewellery` | how to style artificial jewellery | imitation jewellery styling tips | Informational |

### URL Recommendation

Use clean, permanent URLs for indexable SEO pages.

- Good: `/collections/bridal-jewellery`
- Good: `/collections/oxidised-jewellery`
- Avoid for index targets: `?sort=`, `?filter=`, `?occasion=`, `?color=`

## 3. Page-wise SEO Content

These are ready-to-implement jewellery-focused assets. They should be used only after the site catalog and page intent are aligned with jewellery.

### Home Page

Title: `Artificial Jewellery India | The House of Aradhya`

Meta description: `Shop luxury artificial jewellery in India with bridal, festive and party wear styles designed for premium everyday glamour.`

H1: `Luxury Artificial Jewellery for Modern Indian Dressing`

H2 ideas

- `Shop Artificial Jewellery Online in India`
- `Bridal, Festive and Party Wear Jewellery`
- `Why Women Choose The House of Aradhya`

H3 ideas

- `Statement necklace sets`
- `Wedding-ready earrings`
- `Everyday premium styles`

Suggested home copy

The House of Aradhya brings together premium artificial jewellery designed for women who want elegance without compromise. Our collections are created for Indian celebrations, bridal looks, festive dressing, gifting moments, and polished everyday styling. Whether you are shopping for a wedding, a family function, a puja, a cocktail evening, or a statement accessory for travel-friendly glamour, our artificial jewellery is curated to look rich, feel refined, and style effortlessly with Indian and Indo-western outfits.

When women search for artificial jewellery India, imitation jewellery online, or luxury artificial jewellery, they are usually looking for three things: design, trust, and wearability. That is exactly where The House of Aradhya should win. Every collection should feel premium in finish, easy to pair with sarees, lehengas, suits, gowns, and fusion looks, and reliable enough for repeat wear. Our goal is not to sell costume pieces that feel temporary. Our goal is to create statement jewellery that photographs beautifully, elevates personal style, and gives customers the confidence of occasion-ready dressing at a smart price.

Our bridal artificial jewellery range should lead the homepage because it carries the strongest commercial intent. Showcase kundan sets, polki-inspired styles, layered necklace sets, choker designs, bangles, maang tikka sets, and long earrings. Then support that with festive and party categories for women shopping outside wedding season. A strong homepage also needs a visible value proposition: premium finish, lightweight comfort, skin-friendly construction, India-wide delivery, secure payment, and easy exchange support. These trust cues improve conversion and help search visitors feel they have landed on a legitimate brand rather than a generic catalogue.

To improve rankings and conversion together, the homepage should internally link to the main money categories such as bridal jewellery artificial, imitation jewellery necklace set, artificial earrings online, oxidised jewellery online, and jewellery under 999. Add a featured section for bestsellers, a curated section for wedding guests, and a content block that answers buyer questions around styling, gifting, and care. That balance of commercial browsing, educational support, and trust-building will make the homepage stronger for both Google and customers.

### Category Page

Example category: `Bridal Artificial Jewellery`

Title: `Bridal Artificial Jewellery Online in India`

Meta description: `Explore bridal artificial jewellery with premium necklace sets, earrings, bangles and wedding-ready styles for every bridal function.`

H1: `Bridal Artificial Jewellery Online`

H2 ideas

- `Wedding Jewellery for Every Function`
- `Necklace Sets, Earrings and Bridal Essentials`
- `How to Choose the Right Bridal Jewellery Set`

H3 ideas

- `Haldi and mehendi styles`
- `Sangeet and reception looks`
- `Lightweight bridal layering`

Suggested category copy

Bridal artificial jewellery is one of the highest-intent categories in Indian ecommerce because customers are not just browsing for inspiration. They are actively comparing style, finish, price, and delivery confidence before a wedding event. This page should help them move quickly from discovery to decision. The House of Aradhya bridal collection should be positioned as premium imitation jewellery designed for brides, bridesmaids, wedding guests, and family occasions where the look needs to feel rich, elegant, and camera-ready.

A strong bridal jewellery category page should not feel like a plain product grid. It needs a short but useful content block above the fold and a richer guide below the grid. Start by explaining the range: statement bridal necklace sets, chokers, layered haar styles, earrings, bangles, and matching accessories. Then connect the collection to occasions such as engagement, haldi, mehendi, sangeet, wedding ceremony, reception, and festive family functions. This helps expand topical relevance while keeping the content naturally commercial.

Customers shopping for bridal jewellery artificial also need guidance. Some want a heavy kundan-inspired set for traditional looks. Others need a lighter statement piece that works with pastel lehengas, cocktail sarees, or destination wedding styling. Use the category copy to address these needs directly. Mention comfort, premium finish, styling flexibility, and ease of pairing with Indian wear. Add blocks like “shop by occasion”, “shop by finish”, and “complete the look” to increase internal linking and average order value.

Below the product listing, include FAQs that support SEO and conversion: how to choose bridal artificial jewellery by neckline, which styles suit day versus evening functions, how to pair statement earrings with necklace-heavy looks, and how to store imitation jewellery to keep its finish looking fresh. This turns the category page into a richer landing page with real buying support, not just product thumbnails. For search and revenue, that is a much stronger page.

### Product Page

Example product: `Luxury Kundan Necklace Set`

Title: `Luxury Kundan Necklace Set Online in India`

Meta description: `Buy a luxury kundan necklace set online with premium finish, elegant detailing and occasion-ready styling for weddings and festive wear.`

H1: `Luxury Kundan Necklace Set`

H2 ideas

- `Why this necklace set stands out`
- `Styling tips for weddings and festive looks`
- `Delivery, care and customer support`

H3 ideas

- `Best outfits to pair with this set`
- `Lightweight premium finish`
- `Gifting and occasion use`

Suggested product copy

This luxury kundan necklace set is designed for women who want statement jewellery that looks rich, elegant, and occasion-ready without the maintenance or cost of fine jewellery. The design should be positioned around finish, silhouette, and styling flexibility. Whether the customer is shopping for a wedding function, festive dressing, or a standout gift, the page should make it clear that this set is built to elevate Indian wear with premium visual impact.

Use the product description to answer the questions that drive conversion. What kind of occasions is this set ideal for. Does it suit sarees, lehengas, suits, or gowns. Is the look best for bridal styling, wedding guests, or festive evenings. Does it create a bold statement on its own, or can it be layered with earrings and bangles. When this content is written clearly, the product page becomes stronger for both rankings and purchase intent.

Add practical details in scannable form: finish, colour tone, set contents, closure style, comfort notes, and care instructions. Then include a short styling paragraph that helps the shopper imagine the final look. For example, this kundan set can be paired with deep jewel tones, pastel occasion wear, classic reds, or modern ivory ensembles depending on the mood of the event. That styling language helps the page rank for real user intent while also improving conversion confidence.

To make the page more persuasive, place reviews, delivery assurance, easy exchange messaging, and secure payment trust cues close to the add-to-cart area. Add cross-links to matching earrings, bangles, and bridal categories below the fold. Product pages should not end with a single description. They should guide the customer toward a full look.

## 4. Technical Code Snippets

### What was implemented in this repo

- Shared SEO utilities expanded in [src/lib/seo.js](/c:/Users/zafar/OneDrive/Desktop/aradhiya/src/lib/seo.js)
- Metadata and JSON-LD handling improved in [src/components/SeoHead.jsx](/c:/Users/zafar/OneDrive/Desktop/aradhiya/src/components/SeoHead.jsx)
- Base shell metadata improved in [index.html](/c:/Users/zafar/OneDrive/Desktop/aradhiya/index.html)
- Build-time sitemap and robots generation added in [scripts/generate-seo-assets.mjs](/c:/Users/zafar/OneDrive/Desktop/aradhiya/scripts/generate-seo-assets.mjs)
- Route-level code splitting added in [src/App.jsx](/c:/Users/zafar/OneDrive/Desktop/aradhiya/src/App.jsx)
- Below-the-fold video deferral added in [src/components/LazyVideo.jsx](/c:/Users/zafar/OneDrive/Desktop/aradhiya/src/components/LazyVideo.jsx) and [src/components/VideoBanner.jsx](/c:/Users/zafar/OneDrive/Desktop/aradhiya/src/components/VideoBanner.jsx)

### Canonical handling

Use canonicals for clean index pages only. Filtered and sorted pages should be canonicalized to the base category URL and usually set to `noindex`.

```jsx
<SeoHead
  canonicalPath="/collections/bridal-jewellery"
  noIndex={Boolean(searchParams.toString())}
/>
```

### Robots.txt

```txt
User-agent: *
Allow: /

Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /login
Disallow: /register
Disallow: /profile
Disallow: /wishlist
Disallow: /search
Disallow: /*?*sort=
Disallow: /*?*utm_

Sitemap: https://www.thehouseofaradhya.com/sitemap.xml
```

### Sitemap generation

Current implementation fetches:

- static core routes,
- blog article routes,
- live product URLs,
- live collection URLs.

Run with:

```bash
npm run seo:generate
```

### Open Graph and Twitter tags

These are now injected centrally through `SeoHead` and supported by stronger defaults in `index.html`.

## 5. Schema Code

### Product schema

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Luxury Kundan Necklace Set",
  "description": "Premium artificial kundan necklace set for weddings, festive wear and statement Indian styling.",
  "image": [
    "https://www.thehouseofaradhya.com/images/kundan-necklace-set.jpg"
  ],
  "sku": "KNS-001",
  "brand": {
    "@type": "Brand",
    "name": "The House of Aradhya"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "INR",
    "price": 2499,
    "availability": "https://schema.org/InStock",
    "url": "https://www.thehouseofaradhya.com/product/luxury-kundan-necklace-set",
    "itemCondition": "https://schema.org/NewCondition"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.8,
    "reviewCount": 126
  }
}
```

### Review schema

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": {
    "@type": "Person",
    "name": "Priya S"
  },
  "reviewBody": "Beautiful finish, lightweight to wear and perfect for wedding functions.",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": 5,
    "bestRating": 5
  },
  "datePublished": "2026-04-10"
}
```

### Breadcrumb schema

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://www.thehouseofaradhya.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Bridal Jewellery",
      "item": "https://www.thehouseofaradhya.com/collections/bridal-jewellery"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Luxury Kundan Necklace Set",
      "item": "https://www.thehouseofaradhya.com/product/luxury-kundan-necklace-set"
    }
  ]
}
```

### Organization schema

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "The House of Aradhya",
  "url": "https://www.thehouseofaradhya.com/",
  "logo": "https://www.thehouseofaradhya.com/aradhya-logo.png"
}
```

## 6. Internal Linking Strategy

### Category to product

- Every category page should link to its top products with descriptive anchor text.
- Add “best sellers”, “new arrivals”, and “complete the look” blocks below the grid.

### Product to category

- Link product pages back to the main category and subcategory.
- Add matching cross-sell links such as necklace set to earrings, bangles, rings, and bridal collection.

### Blog to commerce

- Every blog post should link to 2 to 4 relevant collection pages.
- Use commercial anchor text like `shop bridal artificial jewellery` or `browse oxidised jewellery online`.
- Add “featured products from this guide” modules inside blog articles.

### Recommended hub structure

- Home -> Bridal Jewellery -> Product
- Home -> Earrings -> Product
- Home -> Oxidised Jewellery -> Product
- Blog -> Category -> Product
- Product -> Matching Products -> Category

## 7. Blog Plan

| Title | Target keyword | Search intent |
| --- | --- | --- |
| How to Style Artificial Jewellery for Weddings and Festive Wear | how to style artificial jewellery | Informational |
| Bridal Artificial Jewellery vs Fine Jewellery: What Should You Choose | bridal artificial jewellery | Commercial investigation |
| Best Artificial Jewellery Sets for Lehenga, Saree and Gown Looks | artificial jewellery sets for lehenga | Informational |
| Imitation Jewellery Online: What to Check Before You Buy | imitation jewellery online | Commercial investigation |
| 10 Luxury Artificial Jewellery Picks for Wedding Guests | luxury artificial jewellery | Commercial |
| Oxidised Jewellery Online: Styling Ideas for Everyday and Festive Wear | oxidised jewellery online | Informational |
| Best Artificial Earrings Online for Party and Wedding Looks | artificial earrings online | Transactional |
| How to Store Artificial Jewellery So It Keeps Looking New | how to store artificial jewellery | Informational |
| Jewellery Under 999 That Still Looks Premium | artificial jewellery under 999 | Commercial |
| Kundan, Polki or Temple Style: Which Artificial Jewellery Works Best | kundan artificial jewellery | Commercial investigation |

## 8. Conversion Optimization

### CTA placement

- Add a primary sticky mobile CTA on product pages.
- Keep `Add to Cart` above the fold with clear price, delivery estimate, and trust cues.
- Add secondary CTAs like `Shop Bridal Collection`, `Complete the Look`, and `View Matching Earrings`.

### Trust badges

- Show secure payments, easy exchange, India-wide shipping, and premium finish badges near the buy box.
- Add a visible shipping promise and support contact line on product pages.

### Reviews

- Move review rating summary closer to title and price.
- Add photo reviews and occasion-specific reviews where possible.
- Surface review count in category cards and product grids.

### Product page improvements

- Add size, finish, weight, and care details in a clearer spec block.
- Add “best paired with” and “occasion” chips.
- Add scarcity cues carefully, only when true.
- Add delivery ETA by pincode before the add-to-cart button.

## 9. Action Checklist

### Immediate

- Align business positioning: confirm whether the brand is men's fashion or artificial jewellery.
- Replace all niche-mismatched keywords and copy.
- Keep only clean indexable collection and product URLs.
- Submit the refreshed sitemap in Google Search Console.
- Validate product rich results after deployment.

### Next 2 weeks

- Create dedicated SEO landing pages for bridal, earrings, bangles, oxidised, kundan, and price-led categories.
- Add richer product descriptions and FAQ blocks.
- Collect and display more verified reviews.
- Compress PNG assets and convert key imagery to WebP or AVIF.

### Next 30 days

- Add pre-rendering or SSR for the main commercial routes.
- Build internal linking from blog to categories and products.
- Launch the first 5 blog articles from the plan above.
- Monitor indexed pages, Core Web Vitals, and product enhancement reports in Search Console.

## 10. Source Notes

These recommendations were cross-checked against current Google documentation for:

- JavaScript SEO basics
- title link best practices
- product structured data
- product variant structured data

Official references:

- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- https://developers.google.com/search/docs/appearance/structured-data/product-variants
