'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import {
  BLOOMS,
  SIGNATURE_PRESETS,
  formatINR,
  getBouquetPricing,
  getRibbonById,
  getWrapById,
  type SignaturePreset,
} from '@/lib/bouquet-data';

interface SignatureCollectionProps {
  activePresetName?: string;
  availableBouquetPhotos?: Record<string, boolean>;
  onSelectPreset: (preset: SignaturePreset) => void;
  onQuickAddPreset: (preset: SignaturePreset) => void;
}

/**
 * Maps each preset id → the flower image paths that visually represent it,
 * drawn from /public/flowers/. Layered smallest-to-largest for a cluster effect.
 */
const PRESET_FLOWER_PREVIEW: Record<string, string[]> = {
  'forest-champagne': [
    '/flowers/eucalyptus.png',
    '/flowers/blush-rose.png',
    '/flowers/lily.png',
    '/flowers/red-rose.png',
  ],
  'sage-mist-serenity': [
    '/flowers/eucalyptus.png',
    '/flowers/tulip.png',
    '/flowers/lily.png',
    '/flowers/blush-rose.png',
  ],
  'blush-atelier': [
    '/flowers/eucalyptus.png',
    '/flowers/tulip.png',
    '/flowers/blush-rose.png',
    '/flowers/peony.png',
  ],
};

/** Layered bouquet-cluster preview using real cutout PNGs instead of plain colour dots. */
function FlowerCluster({ presetId }: { presetId: string }) {
  const paths = PRESET_FLOWER_PREVIEW[presetId] ?? [
    '/flowers/red-rose.png',
    '/flowers/blush-rose.png',
    '/flowers/peony.png',
    '/flowers/eucalyptus.png',
  ];

  return (
    <div
      className="relative flex items-end justify-center"
      style={{ height: 128, minHeight: 128 }}
      aria-hidden="true"
    >
      {paths.map((src, i) => {
        // Fan out horizontally: 4 images spread ±90px centred at 0
        const spread = [-54, -18, 18, 54];
        const offsetX = spread[i] ?? i * 36 - 54;
        // Stagger heights slightly so they overlap naturally
        const offsetY = [8, 0, 4, 10][i] ?? 0;
        const size = [72, 80, 86, 76][i] ?? 72;
        const zIndex = i + 1;

        return (
          <span
            key={src}
            className="absolute bottom-0"
            style={{
              left: '50%',
              transform: `translateX(calc(-50% + ${offsetX}px)) translateY(${offsetY}px)`,
              zIndex,
              width: size,
              height: size,
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="90px"
              className="object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </span>
        );
      })}
    </div>
  );
}

export function SignatureCollection({
  activePresetName,
  availableBouquetPhotos,
  onSelectPreset,
  onQuickAddPreset,
}: SignatureCollectionProps) {
  return (
    <section
      id="collection"
      className="py-16 sm:py-24 px-5 sm:px-8 bg-[#FAF7F2] border-t border-[#A7C0A8]/35 overflow-visible"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs tracking-[0.24em] text-[#4F6D52] font-medium mb-2.5">
              READY-MADE FAVORITES
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] text-[#17271C] leading-[1.1] text-balance">
              Popular Bouquets
            </h2>
          </div>
          <p className="text-sm text-[#4F6D52] max-w-md leading-relaxed">
            Start with one of our most-loved FLOWER rchii bouquets. Tap any
            bouquet to change its flowers, paper, or ribbon in 3D, or add it
            straight to your bag.
          </p>
        </div>

        {/* Fix 4: grid-cols-1 on mobile (<768px), 3-col on md+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {SIGNATURE_PRESETS.map((preset, index) => {
            const pricing = getBouquetPricing({
              wrapId: preset.wrapId,
              ribbonId: preset.ribbonId,
              stems: preset.stems,
              giftNote: preset.giftNote,
              addons: preset.addons,
              presetName: preset.name,
            });
            const wrap = getWrapById(preset.wrapId);
            const ribbon = getRibbonById(preset.ribbonId);
            const isLoaded = activePresetName === preset.name;
            const stemSummary = BLOOMS.filter(
              (b) => (preset.stems[b.id] || 0) > 0
            )
              .slice(0, 4)
              .map((b) => `${preset.stems[b.id]} ${b.name}`);

            return (
              <motion.article
                key={preset.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}

                className={`group min-w-0 max-w-full box-border flex flex-col rounded-[24px] sm:rounded-[28px] border transition-all duration-200 hover:-translate-y-0.5 overflow-hidden ${
                  isLoaded
                    ? 'bg-[#EBF1EC] border-[#4F6D52]'
                    : 'bg-[#F5F1E9]/65 border-[#C8B288]/45 hover:border-[#4F6D52]/60'
                }`}
              >
                {/* Inner content wrapper with proper padding */}
                <div className="px-4 py-5 sm:px-6 flex flex-col flex-1">
                  {/* Top visual: real photo when available, else real flower cluster */}
                  {availableBouquetPhotos?.[preset.id] ? (
                    <div className="relative mb-6 rounded-t-[110px] rounded-b-[20px] bg-[#FAF7F2] border border-[#C8B288]/55 overflow-hidden">
                      <div className="relative w-full aspect-[4/3] bg-[#EBF1EC]">
                        <Image
                          src={preset.photoPath}
                          alt={`${preset.name} — ${preset.subtitle} luxury flower arrangement by FLOWER rchii`}
                          fill
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="px-4 py-2.5 bg-[#FAF7F2] border-t border-[#C8B288]/35 flex min-w-0 max-w-full box-border overflow-hidden flex-wrap items-center justify-between gap-2 text-[11px] text-[#4F6D52]">
                        <span className="min-w-0 max-w-full break-words rounded-full bg-[#EDE0C9] px-2.5 py-1 text-[11px]">{preset.subtitle}</span>
                        <span className="tabular-nums font-medium text-[#17271C] shrink-0">
                          {pricing.totalStems} stems
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Fix 2: Real flower cluster preview instead of colour dots */
                    <div className="relative mb-6 rounded-[20px] pt-5 pb-4 px-5 bg-[#FAF7F2] border border-[#C8B288]/45 overflow-hidden">
                      <div className="flex min-w-0 max-w-full box-border overflow-hidden flex-wrap items-center justify-between text-[11px] text-[#4F6D52] mb-4">
                        <span className="max-w-full box-border break-words rounded-full bg-[#EDE0C9] px-2.5 py-1 text-[11px]">{preset.subtitle}</span>
                        <span className="tabular-nums font-medium text-[#17271C]">
                          {pricing.totalStems} stems
                        </span>
                      </div>

                      {/* Layered real flower cutout preview */}
                      <FlowerCluster presetId={preset.id} />

                      <div className="mt-4 pt-3 border-t border-[#C8B288]/30 flex max-w-full flex-wrap items-center justify-center gap-2 text-[11px] text-[#4F6D52] text-center">
                        <span className="min-w-0 max-w-full break-words">{wrap.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="min-w-0 max-w-full break-words">{ribbon.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Fix 1: Card copy — no overflow clipping, all text 100% visible */}
                  <div className="flex max-w-full box-border overflow-hidden flex-wrap items-baseline justify-between gap-3 mb-2">
                    <h3 className="font-serif text-2xl text-[#17271C] leading-snug">
                      {preset.name}
                    </h3>
                    <span className="text-base font-semibold text-[#17271C] tabular-nums shrink-0">
                      {formatINR(pricing.grandTotal)}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#17271C]/72 leading-relaxed mb-3">
                    {preset.description}
                  </p>

                  {/* Stem breakdown — fully visible */}
                  <p className="text-xs text-[#4F6D52] leading-relaxed mb-5">
                    {stemSummary.join(' · ')}
                  </p>

                  {/* Spacer pushes actions to bottom */}
                  <div className="flex-1" />

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-4 border-t border-[#C8B288]/35">
                    <button
                      type="button"
                      onClick={() => onSelectPreset(preset)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#243B2B] text-xs font-semibold tracking-wide transition-colors max-w-full whitespace-normal"
                    >
                      <span>{isLoaded ? 'Selected in 3D' : 'Edit in 3D'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onQuickAddPreset(preset)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-full border border-[#4F6D52]/50 text-[#17271C] hover:bg-[#4F6D52] hover:text-[#FAF7F2] text-xs font-semibold transition-colors max-w-full whitespace-normal shrink-0"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                      <span>Add to Bag</span>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
