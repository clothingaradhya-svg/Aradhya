// src/components/HeroWith3D.jsx
import React, { useEffect, useMemo, useState } from 'react';
import defaultHeroVideo from '../assets/Coin_in_Nature_Climate_Video.mp4';
import OptimizedImage from './OptimizedImage';

const scheduleIdleWork = (callback, timeout = 1500) => {
  if (typeof window === 'undefined') return () => {};

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, Math.min(timeout, 900));
  return () => window.clearTimeout(id);
};

export default function HeroWith3D({
  heroVideoSrc,
  heroPoster,
  heroSources = [],
  eyebrow = 'Aradhya',
  title = 'Designer wear for men in India',
  description = '',
  ctaLabel = 'Select Skintone',
  onCtaClick,
}) {
  const videoSource = heroVideoSrc || defaultHeroVideo;
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    let cancelled = false;
    const triggerVideoLoad = () => {
      if (!cancelled) {
        setShouldLoadVideo(true);
      }
    };

    const loadAfterWindowReady = () => {
      scheduleCleanup = scheduleIdleWork(triggerVideoLoad, 2200);
    };

    let scheduleCleanup = () => {};

    if (document.readyState === 'complete') {
      loadAfterWindowReady();
    } else {
      window.addEventListener('load', loadAfterWindowReady, { once: true });
    }

    const interactionEvents = ['pointerdown', 'touchstart', 'keydown'];
    const handleInteraction = () => triggerVideoLoad();
    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleInteraction, {
        once: true,
        passive: true,
      });
    });

    return () => {
      cancelled = true;
      scheduleCleanup();
      window.removeEventListener('load', loadAfterWindowReady);
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleInteraction);
      });
    };
  }, [prefersReducedMotion]);

  return (
    <section className="relative flex min-h-[580px] w-full flex-col overflow-hidden bg-neutral-950 md:min-h-[700px] md:h-[88vh]">
      <OptimizedImage
        src={heroPoster}
        sources={heroSources}
        alt={title}
        priority
        pictureClassName="absolute inset-0 z-0 block h-full w-full"
        className="h-full w-full object-cover"
        width={1440}
        height={900}
      />

      {shouldLoadVideo ? (
        <video
          className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-700 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          src={videoSource}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoReady(true)}
        />
      ) : null}

      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-10 backdrop-blur md:h-14"
      />

      <div className="relative z-40 flex flex-1 items-end px-4 pb-10 pt-28 sm:px-6 sm:pb-12 md:px-8 md:pb-16 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl space-y-4 text-white sm:space-y-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/80 sm:text-[11px] sm:tracking-[0.38em]">
              {eyebrow}
            </p>
            <h1 className="max-w-2xl text-[clamp(3.1rem,10vw,5.7rem)] font-semibold leading-[0.95] tracking-tight text-white">
              {title}
            </h1>
            {description ? (
              <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-[15px] sm:leading-7 md:text-base">
                {description}
              </p>
            ) : null}
            <div className="pt-2">
              <button
                type="button"
                onClick={onCtaClick}
                className="rounded-full border border-white/95 px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-white/90 transition hover:bg-white hover:text-neutral-900 sm:px-8 sm:text-[11px] sm:tracking-[0.35em]"
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
