'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Camera,
  Check,
  Eye,
  GripVertical,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  ADDON_OPTIONS,
  BLOOMS,
  MAX_GIFT_NOTE_LENGTH,
  MAX_TOTAL_STEMS,
  RIBBON_OPTIONS,
  WRAP_OPTIONS,
  formatINR,
  getBouquetPricing,
  type AddonId,
  type BloomId,
  type BouquetConfig,
  type RibbonId,
  type WrapId,
} from '@/lib/bouquet-data';

export type CustomizerStep = 1 | 2 | 3;

export type QuickRefineAction = 'fuller' | 'under-1500' | 'pastel-pink';

export interface DragBouquetItem {
  kind: 'bloom' | 'wrap' | 'ribbon';
  id: string;
  label: string;
  imagePath: string;
}

const WRAP_THUMBNAIL_MAP: Record<WrapId, string> = {
  'light-sage': '/flowers/wrap-sage.png',
  'champagne-cream': '/flowers/wrap-cream.png',
  'deep-forest': '/flowers/wrap-forest.png',
};

const RIBBON_THUMBNAIL_MAP: Record<RibbonId, string> = {
  'champagne-gold': '/flowers/ribbon-gold.png',
  'forest-emerald': '/flowers/ribbon-emerald.png',
  'soft-sage': '/flowers/ribbon-sage.png',
};

const QUICK_REFINE_CHIPS: {
  action: QuickRefineAction;
  label: string;
}[] = [
  { action: 'fuller', label: 'Make it fuller (+3 stems)' },
  { action: 'under-1500', label: 'Keep it under ₹1,500' },
  { action: 'pastel-pink', label: 'Switch to pastel pink' },
];

interface ThumbnailProps {
  src: string;
  alt: string;
  fallbackStyle: React.CSSProperties;
  fallbackOverlayColor?: string;
}

function PhotoThumbnail({
  src,
  alt,
  fallbackStyle,
  fallbackOverlayColor,
}: ThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className="w-12 h-12 rounded-xl shrink-0 border border-[#A7C0A8] shadow-inner relative overflow-hidden block"
        style={fallbackStyle}
      >
        {fallbackOverlayColor && (
          <span
            className="absolute inset-y-0 right-0 w-3.5 opacity-90"
            style={{ backgroundColor: fallbackOverlayColor }}
          />
        )}
      </span>
    );
  }

  return (
    <span className="w-12 h-12 rounded-xl shrink-0 border border-[#A7C0A8] bg-[#FAF7F2] overflow-hidden flex items-center justify-center p-1 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className="w-full h-full object-contain pointer-events-none select-none"
      />
    </span>
  );
}

interface CustomizerPanelProps {
  config: BouquetConfig;
  activeStep: CustomizerStep;
  onStepChange: (step: CustomizerStep) => void;
  onChangeWrap: (wrapId: WrapId) => void;
  onChangeRibbon: (ribbonId: RibbonId) => void;
  onAdjustStem: (bloomId: BloomId, delta: number) => void;
  onResetStems: () => void;
  onChangeGiftNote: (note: string) => void;
  onToggleAddon: (addonId: AddonId) => void;
  onFocusGiftTag: () => void;
  onAddToBag: () => void;
  onOpenAiStylist?: (tab: 'stylist' | 'photo') => void;
  onQuickRefine?: (action: QuickRefineAction) => void;
  quickRefineLoading?: QuickRefineAction | null;
  quickRefineNote?: string | null;
  onDragItemStart?: (item: DragBouquetItem) => void;
  onDragItemEnd?: () => void;
  onPointerDragStart?: (
    item: DragBouquetItem,
    event: React.PointerEvent<HTMLButtonElement>
  ) => void;
}

const STEPS: { id: CustomizerStep; shortLabel: string }[] = [
  { id: 1, shortLabel: 'Paper & Ribbon' },
  { id: 2, shortLabel: 'Pick Flowers' },
  { id: 3, shortLabel: 'Card & Extras' },
];

export function CustomizerPanel({
  config,
  activeStep,
  onStepChange,
  onChangeWrap,
  onChangeRibbon,
  onAdjustStem,
  onResetStems,
  onChangeGiftNote,
  onToggleAddon,
  onFocusGiftTag,
  onAddToBag,
  onOpenAiStylist,
  onQuickRefine,
  quickRefineLoading = null,
  quickRefineNote = null,
  onDragItemStart,
  onDragItemEnd,
  onPointerDragStart,
}: CustomizerPanelProps) {
  const pricing = getBouquetPricing(config);
  const canAdd = pricing.totalStems > 0;
  const remainingNoteChars = MAX_GIFT_NOTE_LENGTH - config.giftNote.length;

  const startHtmlDrag = (
    e: React.DragEvent<HTMLElement>,
    item: DragBouquetItem
  ) => {
    e.dataTransfer.setData('application/x-flower-rchii', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    onDragItemStart?.(item);
  };

  return (
    <div className="flex flex-col w-full md:h-full bg-[#FAF7F2] md:border-l border-[#A7C0A8]/40 overflow-x-hidden max-w-full">
      {/* Panel Header & 3-Step Tabs */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#A7C0A8]/30 shrink-0">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl sm:text-[28px] text-[#17271C] leading-tight">
              Design Your Bouquet
            </h2>
            <p className="text-xs text-[#4F6D52] mt-0.5 truncate">
              {config.presetName
                ? `Based on ${config.presetName}`
                : 'Pick flowers, wrap & card message'}
            </p>
          </div>
          <div className="text-right text-xs text-[#4F6D52] tabular-nums shrink-0">
            <span className="font-semibold text-[#17271C]">
              {pricing.totalStems}
            </span>
            <span> / {MAX_TOTAL_STEMS} stems</span>
          </div>
        </div>

        {/* Smart Floral Stylist Card + 3 Quick-Refine Buttons */}
        {(onOpenAiStylist || onQuickRefine) && (
          <div className="mb-3.5 rounded-2xl border border-[#C8B288]/70 bg-[#EBF1EC]/70 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17271C]">
                <Sparkles className="w-3.5 h-3.5 text-[#4F6D52] shrink-0" />
                <span>Smart Floral Stylist</span>
              </div>
              {onOpenAiStylist && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenAiStylist('stylist')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/70 hover:bg-[#4F6D52] text-[11px] font-medium transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3 h-3 text-[#C8B288]" />
                    <span>Ask AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAiStylist('photo')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF7F2] text-[#17271C] border border-[#A7C0A8] hover:border-[#4F6D52] text-[11px] font-medium transition-colors whitespace-nowrap"
                  >
                    <Camera className="w-3 h-3 text-[#4F6D52]" />
                    <span>Photo Help</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3 One-Tap Quick-Refine Chips */}
            {onQuickRefine && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REFINE_CHIPS.map((chip) => {
                  const isBusy = quickRefineLoading === chip.action;
                  return (
                    <button
                      key={chip.action}
                      type="button"
                      disabled={quickRefineLoading !== null}
                      onClick={() => onQuickRefine(chip.action)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FAF7F2] text-[#17271C] border border-[#A7C0A8]/80 hover:border-[#17271C] hover:bg-[#EDE0C9]/55 disabled:opacity-55 text-[11px] font-medium transition-colors"
                    >
                      {isBusy && (
                        <Loader2 className="w-3 h-3 animate-spin text-[#4F6D52] shrink-0" />
                      )}
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {quickRefineNote && (
              <p className="text-[11px] text-[#17271C]/85 leading-relaxed border-t border-[#C8B288]/40 pt-2">
                {quickRefineNote}
              </p>
            )}
          </div>
        )}

        {/* Step Navigation */}
        <div
          role="tablist"
          aria-label="Bouquet steps"
          className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[#EBF1EC] border border-[#A7C0A8]/40"
        >
          {STEPS.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onStepChange(step.id)}
                className={`py-2 px-2 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap truncate ${
                  isActive
                    ? 'bg-[#17271C] text-[#EDE0C9] shadow-sm'
                    : 'text-[#17271C]/75 hover:text-[#17271C]'
                }`}
              >
                <span className="mr-1 opacity-75">{step.id}.</span>
                {step.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Step Body (vertical stack on mobile, internal scroll on desktop) */}
      <div className="md:flex-1 md:overflow-y-auto atelier-scroll px-4 sm:px-6 py-4 sm:py-5">
        <AnimatePresence mode="wait" initial={false}>
          {activeStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <h3 className="font-serif text-xl text-[#17271C]">
                    Step 1: Choose Paper &amp; Ribbon
                  </h3>
                  <span className="text-xs text-[#4F6D52] shrink-0">
                    Included
                  </span>
                </div>
                <p className="text-xs text-[#4F6D52] mb-3">
                  Tap any paper or ribbon — or drag it onto your 3D bouquet.
                </p>

                <p className="text-xs font-semibold text-[#17271C] mb-2">
                  Wrapping Paper
                </p>
                <div className="space-y-2.5">
                  {WRAP_OPTIONS.map((wrap) => {
                    const selected = config.wrapId === wrap.id;
                    const thumbSrc = WRAP_THUMBNAIL_MAP[wrap.id];
                    const dragItem: DragBouquetItem = {
                      kind: 'wrap',
                      id: wrap.id,
                      label: wrap.name,
                      imagePath: thumbSrc,
                    };

                    return (
                      <div
                        key={wrap.id}
                        draggable
                        onDragStart={(e) => startHtmlDrag(e, dragItem)}
                        onDragEnd={() => onDragItemEnd?.()}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                          selected
                            ? 'bg-[#EBF1EC] border-[#4F6D52] ring-2 ring-[#A7C0A8]/60'
                            : 'bg-[#FAF7F2] border-[#A7C0A8]/40 hover:bg-[#EBF1EC]/55'
                        }`}
                      >
                        <button
                          type="button"
                          onPointerDown={(e) =>
                            onPointerDragStart?.(dragItem, e)
                          }
                          aria-label={`Drag ${wrap.name} onto bouquet`}
                          title="Drag onto bouquet"
                          className="touch-none p-1 -ml-1 text-[#4F6D52]/70 hover:text-[#17271C] shrink-0 cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onChangeWrap(wrap.id)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left"
                        >
                          <PhotoThumbnail
                            src={thumbSrc}
                            alt={wrap.name}
                            fallbackStyle={{ backgroundColor: wrap.outerColor }}
                            fallbackOverlayColor={wrap.innerColor}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#17271C] truncate">
                              {wrap.name}
                            </p>
                            <p className="text-xs text-[#4F6D52] truncate mt-0.5">
                              {wrap.subtitle}
                            </p>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              selected
                                ? 'bg-[#4F6D52] text-[#FAF7F2]'
                                : 'border border-[#A7C0A8]'
                            }`}
                          >
                            {selected && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ribbon Selection */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-xs font-semibold text-[#17271C]">Ribbon</p>
                  <span className="text-xs text-[#4F6D52]">Included</span>
                </div>
                <div className="space-y-2.5">
                  {RIBBON_OPTIONS.map((ribbon) => {
                    const selected = config.ribbonId === ribbon.id;
                    const thumbSrc = RIBBON_THUMBNAIL_MAP[ribbon.id];
                    const dragItem: DragBouquetItem = {
                      kind: 'ribbon',
                      id: ribbon.id,
                      label: ribbon.name,
                      imagePath: thumbSrc,
                    };

                    return (
                      <div
                        key={ribbon.id}
                        draggable
                        onDragStart={(e) => startHtmlDrag(e, dragItem)}
                        onDragEnd={() => onDragItemEnd?.()}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                          selected
                            ? 'bg-[#EBF1EC] border-[#4F6D52] ring-2 ring-[#A7C0A8]/60'
                            : 'bg-[#FAF7F2] border-[#A7C0A8]/40 hover:bg-[#EBF1EC]/55'
                        }`}
                      >
                        <button
                          type="button"
                          onPointerDown={(e) =>
                            onPointerDragStart?.(dragItem, e)
                          }
                          aria-label={`Drag ${ribbon.name} onto bouquet`}
                          title="Drag onto bouquet"
                          className="touch-none p-1 -ml-1 text-[#4F6D52]/70 hover:text-[#17271C] shrink-0 cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onChangeRibbon(ribbon.id)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left"
                        >
                          <PhotoThumbnail
                            src={thumbSrc}
                            alt={ribbon.name}
                            fallbackStyle={{
                              background: `linear-gradient(135deg, ${ribbon.color} 0%, ${ribbon.color}CC 52%, #FAF7F2 100%)`,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#17271C] truncate">
                              {ribbon.name}
                            </p>
                            <p className="text-xs text-[#4F6D52] truncate mt-0.5">
                              {ribbon.subtitle}
                            </p>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              selected
                                ? 'bg-[#4F6D52] text-[#FAF7F2]'
                                : 'border border-[#A7C0A8]'
                            }`}
                          >
                            {selected && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => onStepChange(2)}
                  className="px-5 py-2.5 rounded-full bg-[#4F6D52] text-[#FAF7F2] hover:bg-[#17271C] text-xs font-semibold tracking-wide transition-colors"
                >
                  Next: Pick Flowers →
                </button>
              </div>
            </motion.div>
          )}

          {activeStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h3 className="font-serif text-xl text-[#17271C]">
                    Step 2: Pick Your Flowers
                  </h3>
                  <p className="text-xs text-[#4F6D52] mt-0.5">
                    Tap <span className="font-semibold text-[#17271C]">+</span>{' '}
                    or drag any flower directly onto your bouquet.
                  </p>
                </div>
                {pricing.totalStems > 0 && (
                  <button
                    type="button"
                    onClick={onResetStems}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors shrink-0 mt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {BLOOMS.map((bloom) => {
                const count = config.stems[bloom.id] || 0;
                const atLimit = pricing.totalStems >= MAX_TOTAL_STEMS;
                const dragItem: DragBouquetItem = {
                  kind: 'bloom',
                  id: bloom.id,
                  label: bloom.name,
                  imagePath: bloom.imagePath,
                };

                return (
                  <div
                    key={bloom.id}
                    draggable={!atLimit}
                    onDragStart={(e) => {
                      if (!atLimit) startHtmlDrag(e, dragItem);
                    }}
                    onDragEnd={() => onDragItemEnd?.()}
                    className={`w-full flex items-center justify-between gap-2.5 p-3.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                      count > 0
                        ? 'bg-[#EBF1EC]/75 border-[#A7C0A8]'
                        : 'bg-[#FAF7F2] border-[#A7C0A8]/35'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={atLimit}
                        onPointerDown={(e) => {
                          if (!atLimit) onPointerDragStart?.(dragItem, e);
                        }}
                        aria-label={`Drag ${bloom.name} onto bouquet`}
                        title="Drag onto bouquet"
                        className="touch-none p-1 -ml-1 text-[#4F6D52]/70 hover:text-[#17271C] disabled:opacity-30 shrink-0 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>

                      {/* 48x48 Real Flower Photo Thumbnail */}
                      <PhotoThumbnail
                        src={bloom.imagePath}
                        alt={bloom.name}
                        fallbackStyle={{
                          background: `radial-gradient(circle at 35% 35%, ${bloom.swatchSecondary} 0%, ${bloom.swatchPrimary} 72%)`,
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <h4 className="text-sm font-semibold text-[#17271C] leading-snug">
                            {bloom.name}
                          </h4>
                          <span className="text-xs font-medium text-[#4F6D52] tabular-nums">
                            {formatINR(bloom.priceInr)}
                          </span>
                        </div>
                        <p className="text-xs text-[#17271C]/65 truncate mt-0.5">
                          {bloom.botanicalNote}
                        </p>
                      </div>
                    </div>

                    {/* Generous touch-friendly Stem +/- Counter */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAdjustStem(bloom.id, -1)}
                        disabled={count <= 0}
                        aria-label={`Remove one ${bloom.name}`}
                        className="w-9 h-9 rounded-full border border-[#A7C0A8] bg-[#FAF7F2] text-[#17271C] hover:bg-[#17271C] hover:text-[#EDE0C9] hover:border-[#17271C] disabled:opacity-35 disabled:hover:bg-[#FAF7F2] disabled:hover:text-[#17271C] flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-6 text-center text-sm font-semibold text-[#17271C] tabular-nums">
                        {count}
                      </span>

                      <button
                        type="button"
                        onClick={() => onAdjustStem(bloom.id, 1)}
                        disabled={atLimit}
                        aria-label={`Add one ${bloom.name}`}
                        className="w-9 h-9 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#4F6D52] disabled:opacity-35 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onStepChange(1)}
                  className="text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                >
                  ← Back to Paper
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange(3)}
                  className="px-5 py-2.5 rounded-full bg-[#4F6D52] text-[#FAF7F2] hover:bg-[#17271C] text-xs font-semibold tracking-wide transition-colors"
                >
                  Next: Card Message →
                </button>
              </div>
            </motion.div>
          )}

          {activeStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Live 3D Hanging Card Message */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="gift-note-input"
                    className="font-serif text-xl text-[#17271C]"
                  >
                    Step 3: Write Your Card Message
                  </label>
                  <div className="flex items-center gap-3">
                    {onOpenAiStylist && (
                      <button
                        type="button"
                        onClick={() => onOpenAiStylist('stylist')}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C8B288]" />
                        <span>Write with AI</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onFocusGiftTag}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Card in 3D</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#4F6D52] mb-3">
                  Your message appears live on the cream-and-gold card tied to
                  the ribbon.
                </p>

                <div className="relative rounded-2xl border border-[#C8B288]/70 bg-[#FAF7F2] p-3 focus-within:ring-2 focus-within:ring-[#A7C0A8]">
                  <textarea
                    id="gift-note-input"
                    rows={3}
                    maxLength={MAX_GIFT_NOTE_LENGTH}
                    value={config.giftNote}
                    onChange={(e) => onChangeGiftNote(e.target.value)}
                    placeholder="Write a warm message for your gift card..."
                    className="w-full resize-none bg-transparent text-sm text-[#17271C] placeholder:text-[#4F6D52]/55 focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-[#C8B288]/30 text-[11px] text-[#4F6D52] tabular-nums">
                    <span>Printed on thick cream &amp; gold card</span>
                    <span>{remainingNoteChars} chars left</span>
                  </div>
                </div>
              </div>

              {/* Optional Extras */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-serif text-xl text-[#17271C]">
                    Add a Little Extra
                  </h3>
                  <span className="text-xs text-[#4F6D52]">Optional</span>
                </div>

                <div className="space-y-2.5">
                  {ADDON_OPTIONS.map((addon) => {
                    const selected = config.addons.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => onToggleAddon(addon.id)}
                        className={`w-full flex items-center justify-between gap-3.5 p-4 rounded-2xl text-left border transition-all ${
                          selected
                            ? 'bg-[#EBF1EC] border-[#4F6D52] ring-2 ring-[#A7C0A8]/60'
                            : 'bg-[#FAF7F2] border-[#A7C0A8]/35 hover:bg-[#EBF1EC]/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-[#17271C]">
                              {addon.name}
                            </p>
                            <span className="text-xs font-semibold text-[#4F6D52] tabular-nums">
                              +{formatINR(addon.priceInr)}
                            </span>
                          </div>
                          <p className="text-xs text-[#17271C]/65 mt-0.5 leading-relaxed">
                            {addon.description}
                          </p>
                        </div>

                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            selected
                              ? 'bg-[#17271C] text-[#EDE0C9]'
                              : 'border border-[#A7C0A8] bg-[#FAF7F2]'
                          }`}
                        >
                          {selected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-[#4F6D52]" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onStepChange(2)}
                  className="text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                >
                  ← Back to Flowers
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Summary & Add to Bag Bar */}
      <div className="sticky bottom-0 md:static z-10 shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#FAF7F2] border-t border-[#C8B288]/45">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-[#4F6D52] tabular-nums">
              <span>{pricing.totalStems} stems</span>
              {config.addons.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {config.addons.length} extra
                    {config.addons.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
            <p className="font-serif text-2xl sm:text-[26px] font-semibold text-[#17271C] leading-tight tabular-nums">
              {formatINR(pricing.grandTotal)}
            </p>
          </div>

          <button
            type="button"
            disabled={!canAdd}
            onClick={onAddToBag}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#233A2A] disabled:opacity-45 text-xs sm:text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 shadow-[0_10px_24px_rgba(23,39,28,0.18)]"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>{canAdd ? 'Add to Bag' : 'Add 1 flower first'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
