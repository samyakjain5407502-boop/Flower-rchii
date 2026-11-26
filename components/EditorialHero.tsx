'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { ArrowDown, ChevronDown } from 'lucide-react';
import {
  DEFAULT_AVAILABLE_ASSETS,
  type AvailableOptionalAssets,
  type BloomId,
} from '@/lib/bouquet-data';

interface EditorialHeroProps {
  onEnterAtelier: () => void;
  onExploreCollection: () => void;
  availableAssets?: AvailableOptionalAssets;
}

const TOTAL_BLOOM_FRAMES = 36;
const PRELOAD_BLOOM_FRAMES = 8;

function getBloomFramePath(index1Based: number): string {
  return `/hero/bloom-${String(index1Based).padStart(3, '0')}.webp`;
}

/** 10 subtle ambient petals; only the first 4 render below 640px */
const AMBIENT_PETALS = [
  { id: 'ap1', left: '10%', top: '18%', size: 15, color: '#A7C0A8', delay: 0.0, dx: 16, dy: -20, rot: 26, mobile: true },
  { id: 'ap2', left: '86%', top: '16%', size: 14, color: '#C8B288', delay: 0.7, dx: -15, dy: -18, rot: -32, mobile: true },
  { id: 'ap3', left: '14%', top: '78%', size: 16, color: '#C8B288', delay: 1.2, dx: 18, dy: -22, rot: 40, mobile: true },
  { id: 'ap4', left: '84%', top: '74%', size: 14, color: '#EDE0C9', delay: 0.4, dx: -16, dy: -20, rot: -24, mobile: true },
  { id: 'ap5', left: '34%', top: '12%', size: 12, color: '#A7C0A8', delay: 1.6, dx: 12, dy: -16, rot: 18, mobile: false },
  { id: 'ap6', left: '66%', top: '84%', size: 13, color: '#C8B288', delay: 0.9, dx: -14, dy: -18, rot: -42, mobile: false },
  { id: 'ap7', left: '26%', top: '44%', size: 11, color: '#EDE0C9', delay: 1.9, dx: 14, dy: -14, rot: 34, mobile: false },
  { id: 'ap8', left: '74%', top: '40%', size: 13, color: '#A7C0A8', delay: 1.1, dx: -14, dy: -16, rot: -28, mobile: false },
  { id: 'ap9', left: '48%', top: '90%', size: 12, color: '#A7C0A8', delay: 1.4, dx: 10, dy: -18, rot: 22, mobile: false },
  { id: 'ap10', left: '54%', top: '10%', size: 12, color: '#EDE0C9', delay: 0.5, dx: -12, dy: -14, rot: -18, mobile: false },
];

interface StoryPanelItem {
  id: 'choose' | 'arrange' | 'gift';
  stepTitle: string;
  caption: string;
  photoPath: string;
  fallbackBloom: BloomId;
  fallbackAlt: string;
}

const STORY_PANELS: StoryPanelItem[] = [
  {
    id: 'choose',
    stepTitle: 'Choose',
    caption: 'Pick your favorite flowers.',
    photoPath: '/story/choose.jpg',
    fallbackBloom: 'red-rose',
    fallbackAlt: 'Velvet Red Rose from FLOWER rchii',
  },
  {
    id: 'arrange',
    stepTitle: 'Arrange',
    caption: 'See it come together in 3D.',
    photoPath: '/story/arrange.jpg',
    fallbackBloom: 'peony',
    fallbackAlt: 'Dutch Peony arranged inside a FLOWER rchii bouquet',
  },
  {
    id: 'gift',
    stepTitle: 'Gift',
    caption: 'Add a personal card message.',
    photoPath: '/story/gift.jpg',
    fallbackBloom: 'lily',
    fallbackAlt: 'Oriental White Lily gifted with a FLOWER rchii card',
  },
];

let loggedHeroFramesNote = false;

export function EditorialHero({
  onEnterAtelier,
  onExploreCollection,
  availableAssets = DEFAULT_AVAILABLE_ASSETS,
}: EditorialHeroProps) {
  const containerRef = useRef<HTMLElement>(null);
  const bloomCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedFramesRef = useRef<(HTMLImageElement | null)[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const hasWebpSequence = availableAssets.heroBloomFrames;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const progress = scrollYProgress;

  // Dev-only console note when /public/hero/bloom-001.webp…036.webp are not yet uploaded
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' &&
      !hasWebpSequence &&
      !loggedHeroFramesNote
    ) {
      loggedHeroFramesNote = true;
      console.info(
        '[FLOWER rchii] Hero "The Bloom Iris" is using the crisp unfolding peony fallback. Upload /public/hero/bloom-001.webp through /public/hero/bloom-036.webp to enable 36-frame scroll-scrubbed canvas blooming.'
      );
    }
  }, [hasWebpSequence]);

  // Preload first 8 WebP frames and lazy-load remaining 28 when the bloom sequence exists
  useEffect(() => {
    if (!hasWebpSequence) return;
    let active = true;
    const frames: (HTMLImageElement | null)[] = new Array(TOTAL_BLOOM_FRAMES).fill(null);
    loadedFramesRef.current = frames;

    const drawFrame = (idx: number) => {
      const canvas = bloomCanvasRef.current;
      const img = frames[idx];
      if (!canvas || !img || !img.complete) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.max(
        canvas.width / img.naturalWidth,
        canvas.height / img.naturalHeight
      );
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(
        img,
        (canvas.width - dw) * 0.5,
        (canvas.height - dh) * 0.5,
        dw,
        dh
      );
    };

    const loadFrame = (indexZeroBased: number) => {
      const img = new window.Image();
      img.decoding = 'async';
      img.onload = () => {
        if (!active) return;
        frames[indexZeroBased] = img;
        if (
          indexZeroBased === 0 ||
          (prefersReducedMotion && indexZeroBased === TOTAL_BLOOM_FRAMES - 1)
        ) {
          drawFrame(indexZeroBased);
        }
      };
      img.src = getBloomFramePath(indexZeroBased + 1);
    };

    for (let i = 0; i < PRELOAD_BLOOM_FRAMES; i++) {
      loadFrame(i);
    }
    const lazyTimer = window.setTimeout(() => {
      if (!active) return;
      for (let i = PRELOAD_BLOOM_FRAMES; i < TOTAL_BLOOM_FRAMES; i++) {
        loadFrame(i);
      }
    }, 240);

    return () => {
      active = false;
      window.clearTimeout(lazyTimer);
    };
  }, [hasWebpSequence, prefersReducedMotion]);

  // Scrub WebP sequence on canvas between 8% and 38% scroll progress
  useMotionValueEvent(progress, 'change', (latest) => {
    if (!hasWebpSequence) return;
    const canvas = bloomCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = prefersReducedMotion
      ? 1
      : Math.max(0, Math.min(1, (latest - 0.08) / 0.3));
    const targetIdx = Math.min(
      TOTAL_BLOOM_FRAMES - 1,
      Math.round(t * (TOTAL_BLOOM_FRAMES - 1))
    );

    let img: HTMLImageElement | null = null;
    for (let i = targetIdx; i >= 0; i--) {
      const candidate = loadedFramesRef.current[i];
      if (candidate && candidate.complete) {
        img = candidate;
        break;
      }
    }
    if (!img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(
      canvas.width / img.naturalWidth,
      canvas.height / img.naturalHeight
    );
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(
      img,
      (canvas.width - dw) * 0.5,
      (canvas.height - dh) * 0.5,
      dw,
      dh
    );
  });

  // =========================================================================
  // CLEAN, NON-OVERLAPPING GPU TRANSFORM & OPACITY TIMELINE (0% → 100%)
  // =========================================================================

  // Phase 1 (0–11%): Logo crest & Scroll hint — 100% gone BEFORE full bloom or 3 panels
  const crestOpacity = useTransform(progress, [0, 0.055, 0.11], [1, 0.6, 0]);
  const crestScale = useTransform(progress, [0, 0.11], [1, 0.86]);
  const scrollHintOpacity = useTransform(progress, [0, 0.07], [1, 0]);

  // Phase 2 (8–42%): Crisp unfolding peony + fanning eucalyptus foliage inside the oval
  const bloomStageOpacity = useTransform(
    progress,
    [0.07, 0.14, 0.35, 0.44],
    [0, 1, 1, 0]
  );
  const glowOpacity = useTransform(
    progress,
    [0.08, 0.25, 0.4],
    [0.15, 0.92, 0]
  );
  const glowScale = useTransform(progress, [0.08, 0.36], [0.55, 1.2]);

  // Subtle shadowed outer petal halo behind main bloom (adds 3D depth without smearing)
  const haloScale = useTransform(progress, [0.08, 0.36], [0.46, 1.08]);
  const haloRotate = useTransform(progress, [0.08, 0.36], [-16, 0]);
  const haloOpacity = useTransform(
    progress,
    [0.08, 0.2, 0.36],
    [0, 0.42, 0.35]
  );

  // Botanical eucalyptus sprigs gently fanning out left & right
  const leftLeafScale = useTransform(progress, [0.1, 0.36], [0.45, 0.92]);
  const leftLeafRotate = useTransform(progress, [0.1, 0.36], [-14, -36]);
  const leftLeafX = useTransform(progress, [0.1, 0.36], [8, -28]);
  const rightLeafScale = useTransform(progress, [0.1, 0.36], [0.45, 0.92]);
  const rightLeafRotate = useTransform(progress, [0.1, 0.36], [14, 36]);
  const rightLeafX = useTransform(progress, [0.1, 0.36], [-8, 28]);
  const leafOpacity = useTransform(
    progress,
    [0.11, 0.24, 0.37],
    [0, 0.85, 0.88]
  );

  // Single razor-sharp hero Dutch Peony opening cleanly in the center
  const heroBloomScale = useTransform(progress, [0.08, 0.36], [0.38, 1.0]);
  const heroBloomRotate = useTransform(progress, [0.08, 0.36], [12, 0]);
  const heroBloomOpacity = useTransform(
    progress,
    [0.08, 0.16, 0.36],
    [0.2, 1, 1]
  );

  // Phase 3 (36–49%): Unified Oval Iris Aperture opens cleanly (scale 1 → 12, opacity 1 → 0)
  // Completely vanishes before the 3 story panels enter so logo/wall NEVER bleed through!
  const irisScale = useTransform(progress, [0.36, 0.5], [1, 12]);
  const irisWallOpacity = useTransform(progress, [0.42, 0.5], [1, 0]);

  // Phase 4 (44–84%): Editorial Ivory-to-Mint stage + H1 + Subhead + 3 Arch Panels
  const editorialStageOpacity = useTransform(
    progress,
    [0.4, 0.48],
    [0, 1]
  );
  const h1Opacity = useTransform(progress, [0.43, 0.52], [0, 1]);
  const h1Y = useTransform(progress, [0.43, 0.52], [24, 0]);
  const subheadOpacity = useTransform(progress, [0.49, 0.58], [0, 1]);
  const subheadY = useTransform(progress, [0.49, 0.58], [18, 0]);

  const panel0Opacity = useTransform(progress, [0.56, 0.65], [0, 1]);
  const panel0Y = useTransform(progress, [0.56, 0.65], [34, 0]);

  const panel1Opacity = useTransform(progress, [0.64, 0.73], [0, 1]);
  const panel1Y = useTransform(progress, [0.64, 0.73], [34, 0]);

  const panel2Opacity = useTransform(progress, [0.72, 0.81], [0, 1]);
  const panel2Y = useTransform(progress, [0.72, 0.81], [34, 0]);

  const panelMotion = [
    { opacity: panel0Opacity, y: panel0Y },
    { opacity: panel1Opacity, y: panel1Y },
    { opacity: panel2Opacity, y: panel2Y },
  ];

  const stageVisibility = useTransform(progress, value => value >= 1 ? 'hidden' : 'visible');
  const stageOpacity = useTransform(progress, [0.9, 1], [1, 0]);

  // Phase 5 (82–94%): Action CTAs fade in cleanly
  const ctaOpacity = useTransform(progress, [0.81, 0.9], [0, 1]);
  const ctaY = useTransform(progress, [0.81, 0.9], [20, 0]);

  // Always use transparent cleaned cutouts (never raw white-box PNGs)
  const peonyDataUrl = '/hero/peony.webp';
  const eucalyptusDataUrl = '/hero/eucalyptus.webp';

  // === REDUCED MOTION STATIC PRESENTATION ===
  if (prefersReducedMotion) {
    return (
      <section
        id="top"
        aria-label="FLOWER rchii — The Bloom Iris"
        className="relative min-h-[calc(100svh-4rem)] overflow-hidden flex flex-col items-center justify-center px-5 sm:px-8 py-12"
        style={{
          background:
            'radial-gradient(circle at 50% 44%, #FAF7F2 0%, #F2F0EA 48%, #EBF1EC 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 atelier-vignette"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 atelier-film-grain opacity-40"
        />

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
          {/* Final Opened Bloom inside Champagne Oval Crest */}
          <div className="relative mb-5 flex items-center justify-center w-[132px] h-[176px] rounded-full border border-[#C8B288] bg-[#17271C] shadow-[0_14px_34px_rgba(23,39,28,0.2)]">
            <div className="absolute inset-1.5 rounded-full border border-[#EDE0C9]/65" />
            <div
              aria-hidden="true"
              className="absolute w-24 h-24 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(237, 224, 201, 0.5) 0%, rgba(237, 224, 201, 0) 72%)',
              }}
            />
            {peonyDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={peonyDataUrl}
                alt="Opened Dutch Peony inside the FLOWER rchii oval crest"
                className="relative z-10 w-24 h-24 object-contain"
                style={{
                  filter: 'drop-shadow(0 8px 16px rgba(23, 39, 28, 0.55))',
                }}
              />
            )}
          </div>

          <h1
            className="font-serif italic text-[#17271C] leading-[1.05] text-balance mb-1.5"
            style={{ fontSize: 'clamp(2.1rem, 5.4vw, 4.2rem)' }}
          >
            Where flower is bloom.
          </h1>
          <p
            className="text-[#4F6D52] tracking-wide mb-6"
            style={{ fontSize: 'clamp(0.9rem, 1.7vw, 1.15rem)' }}
          >
            Pick every flower, wrap, and card message yourself.
          </p>

          {/* Static 3 Arch Story Panels (Clean single-column vertical stack on mobile < 768px, 3-col on md+) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pb-2 mb-6">
            {STORY_PANELS.map((panel) => {
              const hasPhoto = availableAssets.storyPhotos[panel.id];
              const fallbackDataUrl = `/hero/${panel.fallbackBloom}.webp`;
              return (
                <article
                  key={panel.id}
                  className="w-full rounded-t-[180px] rounded-b-[22px] border border-[#C8B288]/75 bg-[#FAF7F2] overflow-hidden shadow-[0_12px_30px_rgba(23,39,28,0.08)]"
                >
                  <div
                    className="relative h-36 sm:h-44 flex items-center justify-center overflow-hidden"
                    style={{
                      background:
                        'linear-gradient(180deg, #A7C0A8 0%, #EBF1EC 100%)',
                    }}
                  >
                    {hasPhoto ? (
                      <Image
                        src={panel.photoPath}
                        alt={panel.fallbackAlt}
                        fill
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        sizes="(max-width: 768px) 260px, 320px"
                        className="object-cover"
                      />
                    ) : fallbackDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fallbackDataUrl}
                        alt={panel.fallbackAlt}
                        loading="lazy"
                        className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                        style={{
                          filter:
                            'drop-shadow(0 10px 18px rgba(23, 39, 28, 0.32))',
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#EDE0C9]/50" />
                    )}
                  </div>
                  <div className="px-4 py-3.5 text-center">
                    <h2 className="font-serif text-xl text-[#17271C]">
                      {panel.stepTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#4F6D52] mt-0.5">
                      {panel.caption}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onEnterAtelier}
              className="pointer-events-auto inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288] hover:bg-[#4F6D52] text-xs sm:text-sm font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6D52]"
            >
              <span>Design Your Bouquet</span>
              <ArrowDown className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={onExploreCollection}
              className="pointer-events-auto inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#A7C0A8] bg-[#FAF7F2] text-[#17271C] hover:bg-[#EBF1EC] text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6D52]"
            >
              <span>Popular Bouquets</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="top"
      ref={containerRef}
      aria-label="FLOWER rchii — The Bloom Iris"
      className="relative z-10 -mt-[65px] h-[300svh] mb-[-100svh] pointer-events-none"
    >
      <motion.div style={{ opacity: stageOpacity, visibility: stageVisibility }} className="sticky top-0 h-[100svh] w-full overflow-hidden flex items-center justify-center bg-[#17271C]">
        {/* === LAYER 1: REVEALED IVORY-TO-MINT RADIAL STAGE (44–100%) === */}
        <motion.div
          style={{
            opacity: editorialStageOpacity,
            background:
              'radial-gradient(circle at 50% 44%, #FAF7F2 0%, #F2F0EA 48%, #EBF1EC 100%)',
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 sm:px-8 pt-12 pb-5 sm:py-6"
        >
          {/* CSS-only soft vignette & subtle analog film grain */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 atelier-vignette"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 atelier-film-grain opacity-40"
          />

          {/* Ambient drifting petals: 10 on desktop, 4 below 640px */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {AMBIENT_PETALS.map((p) => (
              <motion.span
                key={p.id}
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size * 1.45,
                  backgroundColor: p.color,
                }}
                animate={{
                  x: [0, p.dx, 0],
                  y: [0, p.dy, 0],
                  rotate: [p.rot, p.rot + 22, p.rot],
                  opacity: [0.22, 0.54, 0.22],
                }}
                transition={{
                  duration: 7.5 + p.delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: p.delay,
                }}
                className={`absolute rounded-[70%_30%_65%_35%/60%_40%_60%_40%] will-change-transform ${
                  p.mobile ? 'block' : 'hidden sm:block'
                }`}
              />
            ))}
          </div>

          {/* Editorial Reveal Container (Compactly proportioned to never clip inside viewport) */}
          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
            <motion.h1
              style={{
                opacity: h1Opacity,
                y: h1Y,
                fontSize: 'clamp(1.9rem, 4.8vw, 3.85rem)',
              }}
              className="font-serif italic text-[#17271C] leading-[1.06] text-balance will-change-transform"
            >
              Where flower is bloom.
            </motion.h1>

            <motion.p
              style={{
                opacity: subheadOpacity,
                y: subheadY,
                fontSize: 'clamp(0.88rem, 1.55vw, 1.12rem)',
              }}
              className="mt-1.5 text-[#4F6D52] tracking-wide will-change-transform"
            >
              Pick every flower, wrap, and card message yourself.
            </motion.p>

            {/* Three Arch-Topped Story Panels (Clean single-column vertical stack on mobile < 768px, 3-col on md+) */}
            <div className="w-full mt-3.5 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5 pb-1.5 px-4 sm:px-1">
              {STORY_PANELS.map((panel, idx) => {
                const hasPhoto = availableAssets.storyPhotos[panel.id];
                const fallbackDataUrl = `/hero/${panel.fallbackBloom}.webp`;

                return (
                  <motion.article
                    key={panel.id}
                    style={{
                      opacity: panelMotion[idx].opacity,
                      y: panelMotion[idx].y,
                    }}
                    className="w-full rounded-t-[180px] rounded-b-[20px] border border-[#C8B288]/75 bg-[#FAF7F2] overflow-hidden shadow-[0_12px_30px_rgba(23,39,28,0.09)] will-change-transform"
                  >
                    <div
                      className="relative h-28 sm:h-40 lg:h-44 flex items-center justify-center overflow-hidden"
                      style={{
                        background:
                          'linear-gradient(180deg, #A7C0A8 0%, #EBF1EC 100%)',
                      }}
                    >
                      {hasPhoto ? (
                        <Image
                          src={panel.photoPath}
                          alt={panel.fallbackAlt}
                          fill
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          sizes="(max-width: 768px) 240px, 320px"
                          className="object-cover"
                        />
                      ) : fallbackDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fallbackDataUrl}
                          alt={panel.fallbackAlt}
                          loading="lazy"
                          className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
                          style={{
                            filter:
                              'drop-shadow(0 10px 18px rgba(23, 39, 28, 0.34))',
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-[#EDE0C9]/55" />
                      )}
                    </div>
                    <div className="px-4 py-2.5 sm:py-3 text-center bg-[#FAF7F2]">
                      <h2 className="font-serif text-lg sm:text-xl text-[#17271C] leading-tight">
                        {panel.stepTitle}
                      </h2>
                      <p className="text-xs text-[#4F6D52] mt-0.5">
                        {panel.caption}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>

            <motion.p
              style={{ opacity: panel0Opacity }}
              className="md:hidden text-[10px] tracking-[0.2em] uppercase text-[#4F6D52]/80 mt-1"
            >
              Swipe to explore →
            </motion.p>

            {/* Primary & Secondary Atelier CTAs */}
            <motion.div
              style={{ opacity: ctaOpacity, y: ctaY }}
              className="mt-3.5 sm:mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 will-change-transform"
            >
              <button
                type="button"
                onClick={onEnterAtelier}
                className="pointer-events-auto inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288] hover:bg-[#4F6D52] text-xs sm:text-sm font-semibold tracking-wide transition-colors shadow-[0_10px_24px_rgba(23,39,28,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6D52]"
              >
                <span>Design Your Bouquet</span>
                <ArrowDown className="w-4 h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={onExploreCollection}
                className="pointer-events-auto inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full border border-[#A7C0A8] bg-[#FAF7F2] text-[#17271C] hover:bg-[#EBF1EC] text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6D52]"
              >
                <span>Popular Bouquets</span>
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* === LAYER 2: UNIFIED SYNCHRONIZED OVAL IRIS PORTAL (0–50%) === */}
        {/* Single oval element + box-shadow forest wall guarantees 100% alignment at every viewport size */}
        <motion.div
          style={{ opacity: irisWallOpacity }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
        >
          <motion.div
            style={{
              scale: irisScale,
              width: 'min(74vw, 340px)',
              maxHeight: '62svh',
              aspectRatio: '3 / 4',
            }}
            className="relative rounded-full flex items-center justify-center will-change-transform"
          >
            {/* Outer & Inner thin double-line champagne oval borders */}
            <div
              aria-hidden="true"
              className="absolute -inset-2 rounded-full border-[1.5px] border-[#C8B288]/90"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-[#EDE0C9]/65"
            />

            {/* 4 Cardinal Champagne Diamond Accents */}
            <span
              aria-hidden="true"
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#C8B288]"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#C8B288]"
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#EDE0C9]/85"
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#EDE0C9]/85"
            />

            {/* Inner Oval Interior — strictly clipped to the oval */}
            <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
              {/* Phase 2 (8–42%): Crisp Unfolding Flower Composition */}
              <motion.div
                style={{ opacity: bloomStageOpacity }}
                className="absolute inset-0 flex items-center justify-center bg-[#17271C]"
              >
                {/* Warm champagne radial halo */}
                <motion.div
                  aria-hidden="true"
                  style={{ opacity: glowOpacity, scale: glowScale }}
                  className="absolute w-[88%] aspect-square rounded-full will-change-transform"
                >
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(237, 224, 201, 0.56) 0%, rgba(200, 178, 136, 0.22) 45%, rgba(23, 39, 28, 0) 74%)',
                    }}
                  />
                </motion.div>

                {hasWebpSequence ? (
                  <canvas
                    ref={bloomCanvasRef}
                    width={540}
                    height={720}
                    aria-label="Unfolding flower bud animation"
                    className="relative z-10 w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative z-10 w-[86%] aspect-square flex items-center justify-center">
                    {/* Fanning eucalyptus greenery left & right */}
                    {eucalyptusDataUrl && (
                      <>
                        <motion.img
                          src={eucalyptusDataUrl}
                          alt=""
                          aria-hidden="true"
                          style={{
                            scale: leftLeafScale,
                            rotate: leftLeafRotate,
                            x: leftLeafX,
                            opacity: leafOpacity,
                            filter:
                              'brightness(0.92) drop-shadow(0 8px 14px rgba(23, 39, 28, 0.6))',
                          }}
                          className="absolute w-[62%] h-[62%] object-contain will-change-transform"
                        />
                        <motion.img
                          src={eucalyptusDataUrl}
                          alt=""
                          aria-hidden="true"
                          style={{
                            scale: rightLeafScale,
                            rotate: rightLeafRotate,
                            x: rightLeafX,
                            opacity: leafOpacity,
                            filter:
                              'brightness(0.92) drop-shadow(0 8px 14px rgba(23, 39, 28, 0.6))',
                          }}
                          className="absolute w-[62%] h-[62%] object-contain will-change-transform"
                        />
                      </>
                    )}

                    {/* Subtle shadowed back-petal halo for depth */}
                    {peonyDataUrl && (
                      <motion.img
                        src={peonyDataUrl}
                        alt=""
                        aria-hidden="true"
                        style={{
                          scale: haloScale,
                          rotate: haloRotate,
                          opacity: haloOpacity,
                          filter:
                            'brightness(0.72) blur(1px) drop-shadow(0 14px 24px rgba(23, 39, 28, 0.7))',
                        }}
                        className="absolute w-[84%] h-[84%] object-contain will-change-transform"
                      />
                    )}

                    {/* Single razor-sharp hero Dutch Peony opening cleanly */}
                    {peonyDataUrl && (
                      <motion.img
                        src={peonyDataUrl}
                        alt="Blooming Dutch Peony inside the FLOWER rchii oval iris"
                        style={{
                          scale: heroBloomScale,
                          rotate: heroBloomRotate,
                          opacity: heroBloomOpacity,
                          filter:
                            'contrast(1.04) saturate(1.06) drop-shadow(0 12px 24px rgba(23, 39, 28, 0.62))',
                        }}
                        className="relative z-10 w-[86%] h-[86%] object-contain will-change-transform"
                      />
                    )}
                  </div>
                )}
              </motion.div>

              {/* Phase 1 (0–11%): Official FLOWER rchii Crest — 100% gone by 11% */}
              <motion.div
                style={{ opacity: crestOpacity, scale: crestScale }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-[#17271C] will-change-transform"
              >
                <div className="relative w-[86%] h-[86%]">
                  <Image
                    src="/logo.png"
                    alt="FLOWER rchii — WHERE FLOWER IS BLOOM official monogram crest"
                    fill
                    priority
                    referrerPolicy="no-referrer"
                    sizes="(max-width: 640px) 240px, 300px"
                    className="object-contain"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* === TOP-RIGHT SKIP INTRO PILL (clearly visible below Navbar) === */}
        <div className="absolute top-20 right-4 sm:top-24 sm:right-8 z-30">
          <button
            type="button"
            onClick={onEnterAtelier}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#17271C]/90 border border-[#C8B288]/70 text-[#EDE0C9] hover:bg-[#4F6D52] hover:border-[#EDE0C9] text-xs font-medium tracking-wide transition-colors whitespace-nowrap shadow-[0_6px_20px_rgba(23,39,28,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8B288]"
          >
            <span>Skip Intro</span>
            <ArrowDown className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* === 0–7% TINY "SCROLL" HINT WITH BOUNCING CHEVRON === */}
        <motion.div
          style={{ opacity: scrollHintOpacity }}
          className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-30"
        >
          <button
            type="button"
            onClick={onEnterAtelier}
            aria-label="Scroll to enter the atelier"
            className="pointer-events-auto inline-flex flex-col items-center gap-1 text-[#EDE0C9] hover:text-[#C8B288] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8B288] rounded-full px-3 py-1"
          >
            <span className="text-[11px] tracking-[0.28em] uppercase font-medium">
              Scroll
            </span>
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: 'easeOut' }}
            >
              <ChevronDown className="w-4 h-4 text-[#C8B288]" />
            </motion.span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
