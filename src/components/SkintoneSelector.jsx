import React from 'react';
import OptimizedImage from './OptimizedImage';

const skintones = [
  {
    id: 'fair-skin',
    label: 'FAIR SKINTONE',
    image: '/images/skintone-fair.png',
    webp: '/images/skintone-fair.webp',
  },
  {
    id: 'neutral-skin',
    label: 'NEUTRAL SKINTONE',
    image: '/images/skintone-neutral.png',
    webp: '/images/skintone-neutral.webp',
  },
  {
    id: 'dark-skin',
    label: 'DARK SKINTONE',
    image: '/images/skintone-dark.png',
    webp: '/images/skintone-dark.webp',
  },
];

export default function SkintoneSelector({ onSelect }) {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <h2 className="text-center text-2xl md:text-4xl font-semibold tracking-[0.15em] uppercase text-slate-900">
          Select Your Skintone & Get Perfect Combination
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {skintones.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => onSelect?.(tone.id)}
              className="block w-full"
            >
              <OptimizedImage
                src={tone.image}
                sources={[{ srcSet: tone.webp, type: 'image/webp' }]}
                alt={`${tone.label} outfit combinations for men`}
                className="block w-full h-auto"
                width={768}
                height={960}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
