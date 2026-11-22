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

export function SignatureCollection({
  activePresetName,
  availableBouquetPhotos,
  onSelectPreset,
  onQuickAddPreset,
}: SignatureCollectionProps) {
  return (
    <section
      id="collection"
      className="py-16 sm:py-24 px-5 sm:px-8 bg-[#FAF7F2] border-t border-[#A7C0A8]/35"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs tracking-[0.24em] text-[#4F6D52] font-medium mb-2.5">
              SIGNATURE PRE-MADE COLLECTION
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] text-[#17271C] leading-[1.1] text-balance">
              Curated House Arrangements
            </h2>
          </div>
          <p className="text-sm text-[#4F6D52] max-w-md leading-relaxed">
            Begin with an iconic FLOWER rchii composition. Tap any edition to
            load its exact stems, wrapping paper, and ribbon directly onto the
            3D Atelier stage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
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
                className={`group flex flex-col justify-between rounded-[28px] p-6 sm:p-7 border transition-all duration-200 hover:-translate-y-0.5 ${
                  isLoaded
                    ? 'bg-[#EBF1EC] border-[#4F6D52]'
                    : 'bg-[#F5F1E9]/65 border-[#C8B288]/45 hover:border-[#4F6D52]/60'
                }`}
              >
                <div>
                  {/* Editorial Arch Header: real photo (/public/bouquets/<id>.jpg) when available, else botanical palette */}
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
                      <div className="px-4 py-2.5 bg-[#FAF7F2] border-t border-[#C8B288]/35 flex items-center justify-between gap-2 text-[11px] text-[#4F6D52]">
                        <span className="truncate">{preset.subtitle}</span>
                        <span className="tabular-nums font-medium text-[#17271C] shrink-0">
                          {pricing.totalStems} stems
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative mb-6 rounded-t-[110px] rounded-b-[20px] p-5 bg-[#FAF7F2] border border-[#C8B288]/45 overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] text-[#4F6D52] mb-5">
                        <span>{preset.subtitle}</span>
                        <span className="tabular-nums font-medium text-[#17271C]">
                          {pricing.totalStems} stems
                        </span>
                      </div>

                      {/* Visual botanical color composition */}
                      <div className="flex items-center justify-center -space-x-3 py-3">
                        {preset.palette.map((hex, i) => (
                          <span
                            key={`${preset.id}-c-${i}`}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[#FAF7F2] shadow-sm transition-transform duration-300 group-hover:scale-105"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#C8B288]/30 flex items-center justify-center gap-2 text-[11px] text-[#4F6D52] text-center">
                        <span className="truncate">{wrap.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{ribbon.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Card Copy */}
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3 className="font-serif text-2xl text-[#17271C] leading-snug">
                      {preset.name}
                    </h3>
                    <span className="text-base font-semibold text-[#17271C] tabular-nums shrink-0">
                      {formatINR(pricing.grandTotal)}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#17271C]/72 leading-relaxed mb-4">
                    {preset.description}
                  </p>

                  {/* Clean unboxed recipe list */}
                  <p className="text-xs text-[#4F6D52] leading-relaxed mb-6">
                    {stemSummary.join(' · ')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-4 border-t border-[#C8B288]/35">
                  <button
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#243B2B] text-xs font-semibold tracking-wide transition-colors whitespace-nowrap"
                  >
                    <span>{isLoaded ? 'Loaded in 3D' : 'Customize in 3D'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickAddPreset(preset)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-[#4F6D52]/50 text-[#17271C] hover:bg-[#4F6D52] hover:text-[#FAF7F2] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span>Quick Add</span>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
