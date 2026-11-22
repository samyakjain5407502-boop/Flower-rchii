'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
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
  /** Mobile expandable bottom-sheet props */
  isMobileSheet?: boolean;
  mobileExpanded?: boolean;
  onToggleMobileExpand?: () => void;
}

const STEPS: { id: CustomizerStep; shortLabel: string; title: string }[] = [
  { id: 1, shortLabel: 'Wrap & Ribbon', title: 'Wrapping & Ribbon' },
  { id: 2, shortLabel: 'Pick Blooms', title: 'Pick Your Blooms' },
  { id: 3, shortLabel: 'Personal Touch', title: 'Gift Tag & Add-ons' },
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
  isMobileSheet = false,
  mobileExpanded = false,
  onToggleMobileExpand,
}: CustomizerPanelProps) {
  const pricing = getBouquetPricing(config);
  const canAdd = pricing.totalStems > 0;
  const remainingNoteChars = MAX_GIFT_NOTE_LENGTH - config.giftNote.length;

  return (
    <div
      className={`flex flex-col h-full bg-[#FAF7F2]/92 backdrop-blur-md ${
        isMobileSheet
          ? 'rounded-t-[28px] border-t border-[#A7C0A8]/50 shadow-[0_-12px_40px_rgba(23,39,28,0.12)]'
          : 'border-l border-[#A7C0A8]/40'
      }`}
    >
      {/* Mobile drag/expand handle */}
      {isMobileSheet && onToggleMobileExpand && (
        <button
          type="button"
          onClick={onToggleMobileExpand}
          className="w-full pt-2.5 pb-1.5 px-5 flex flex-col items-center gap-1 text-[#4F6D52] focus-visible:outline-none"
          aria-label={mobileExpanded ? 'Collapse customizer sheet' : 'Expand customizer sheet'}
        >
          <span className="w-10 h-1 rounded-full bg-[#A7C0A8]/70" />
          <span className="inline-flex items-center gap-1 text-[11px] font-medium">
            {mobileExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show more of 3D bouquet</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Expand customizer</span>
              </>
            )}
          </span>
        </button>
      )}

      {/* Panel Header & 3-Step Segmented Tabs */}
      <div className="px-5 sm:px-7 pt-4 sm:pt-6 pb-4 border-b border-[#A7C0A8]/30 shrink-0">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-[28px] text-[#17271C] leading-tight">
              The Atelier
            </h2>
            <p className="text-xs text-[#4F6D52] mt-0.5">
              {config.presetName
                ? `Inspired by ${config.presetName}`
                : 'Bespoke Bouquet Creation'}
            </p>
          </div>
          <div className="text-right text-xs text-[#4F6D52] tabular-nums">
            <span className="font-semibold text-[#17271C]">
              {pricing.totalStems}
            </span>
            <span> / {MAX_TOTAL_STEMS} stems</span>
          </div>
        </div>

        {/* Gemini AI Floral Stylist & Bouquet Photo Assistant Quick Actions */}
        {onOpenAiStylist && (
          <div className="grid grid-cols-2 gap-2 mb-3.5">
            <button
              type="button"
              onClick={() => onOpenAiStylist('stylist')}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/70 hover:bg-[#4F6D52] text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C8B288] shrink-0" />
              <span>AI Bouquet Stylist</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAiStylist('photo')}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-[#EBF1EC] text-[#17271C] border border-[#A7C0A8] hover:border-[#4F6D52] text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5 text-[#4F6D52] shrink-0" />
              <span>AI Photo Review</span>
            </button>
          </div>
        )}

        {/* Step Navigation */}
        <div
          role="tablist"
          aria-label="Bouquet customization steps"
          className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-[#EBF1EC] border border-[#A7C0A8]/35"
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
                className={`py-2 px-2.5 rounded-full text-xs font-medium transition-all whitespace-nowrap truncate ${
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

      {/* Scrollable Step Body */}
      <div className="flex-1 overflow-y-auto atelier-scroll px-5 sm:px-7 py-5">
        <AnimatePresence mode="wait" initial={false}>
          {activeStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-7"
            >
              {/* Paper Wrap Selection */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-serif text-xl text-[#17271C]">
                    Botanical Wrapping Paper
                  </h3>
                  <span className="text-xs text-[#4F6D52]">Included</span>
                </div>
                <div className="space-y-2.5">
                  {WRAP_OPTIONS.map((wrap) => {
                    const selected = config.wrapId === wrap.id;
                    return (
                      <button
                        key={wrap.id}
                        type="button"
                        onClick={() => onChangeWrap(wrap.id)}
                        className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all border ${
                          selected
                            ? 'bg-[#EBF1EC] border-[#4F6D52] ring-2 ring-[#A7C0A8]/60'
                            : 'bg-[#FAF7F2] border-[#A7C0A8]/35 hover:bg-[#EBF1EC]/55'
                        }`}
                      >
                        <span
                          className="w-11 h-11 rounded-full shrink-0 border border-[#C8B288]/70 shadow-inner relative overflow-hidden"
                          style={{ backgroundColor: wrap.outerColor }}
                        >
                          <span
                            className="absolute inset-y-0 right-0 w-3.5 opacity-90"
                            style={{ backgroundColor: wrap.innerColor }}
                          />
                        </span>
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
                    );
                  })}
                </div>
              </div>

              {/* Ribbon Selection */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-serif text-xl text-[#17271C]">
                    Hand-Tied Ribbon
                  </h3>
                  <span className="text-xs text-[#4F6D52]">Included</span>
                </div>
                <div className="space-y-2.5">
                  {RIBBON_OPTIONS.map((ribbon) => {
                    const selected = config.ribbonId === ribbon.id;
                    return (
                      <button
                        key={ribbon.id}
                        type="button"
                        onClick={() => onChangeRibbon(ribbon.id)}
                        className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all border ${
                          selected
                            ? 'bg-[#EBF1EC] border-[#4F6D52] ring-2 ring-[#A7C0A8]/60'
                            : 'bg-[#FAF7F2] border-[#A7C0A8]/35 hover:bg-[#EBF1EC]/55'
                        }`}
                      >
                        <span
                          className="w-11 h-11 rounded-full shrink-0 border border-[#C8B288]/60 shadow-inner"
                          style={{
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
                  Continue to Blooms →
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#4F6D52]">
                  Tap <span className="font-semibold text-[#17271C]">+</span> to
                  watch stems bloom into a golden-angle dome.
                </p>
                {pricing.totalStems > 0 && (
                  <button
                    type="button"
                    onClick={onResetStems}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors shrink-0 ml-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {BLOOMS.map((bloom) => {
                const count = config.stems[bloom.id] || 0;
                const atLimit = pricing.totalStems >= MAX_TOTAL_STEMS;
                return (
                  <div
                    key={bloom.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                      count > 0
                        ? 'bg-[#EBF1EC]/75 border-[#A7C0A8]'
                        : 'bg-[#FAF7F2] border-[#A7C0A8]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Dual-tone botanical petal swatch */}
                      <div
                        className="w-10 h-10 rounded-full shrink-0 border border-[#C8B288]/55 shadow-sm"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${bloom.swatchSecondary} 0%, ${bloom.swatchPrimary} 72%)`,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-[#17271C] leading-snug">
                            {bloom.name}
                          </h4>
                          <span className="text-xs font-medium text-[#4F6D52] tabular-nums">
                            {formatINR(bloom.priceInr)}/stem
                          </span>
                        </div>
                        <p className="text-xs text-[#17271C]/65 truncate mt-0.5">
                          {bloom.botanicalNote}
                        </p>
                      </div>
                    </div>

                    {/* Stem +/- Counter */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAdjustStem(bloom.id, -1)}
                        disabled={count <= 0}
                        aria-label={`Remove one ${bloom.name}`}
                        className="w-8 h-8 rounded-full border border-[#A7C0A8] bg-[#FAF7F2] text-[#17271C] hover:bg-[#17271C] hover:text-[#EDE0C9] hover:border-[#17271C] disabled:opacity-35 disabled:hover:bg-[#FAF7F2] disabled:hover:text-[#17271C] flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-7 text-center text-sm font-semibold text-[#17271C] tabular-nums">
                        {count}
                      </span>

                      <button
                        type="button"
                        onClick={() => onAdjustStem(bloom.id, 1)}
                        disabled={atLimit}
                        aria-label={`Add one ${bloom.name}`}
                        className="w-8 h-8 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#4F6D52] disabled:opacity-35 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onStepChange(1)}
                  className="text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                >
                  ← Back to Wrap
                </button>
                <button
                  type="button"
                  onClick={() => onStepChange(3)}
                  className="px-5 py-2.5 rounded-full bg-[#4F6D52] text-[#FAF7F2] hover:bg-[#17271C] text-xs font-semibold tracking-wide transition-colors"
                >
                  Personalize Gift Tag →
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
              className="space-y-7"
            >
              {/* Live 3D Hanging Cardstock Gift Note */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <label
                    htmlFor="gift-note-input"
                    className="font-serif text-xl text-[#17271C]"
                  >
                    Custom Hanging Gift Tag
                  </label>
                  <div className="flex items-center gap-3">
                    {onOpenAiStylist && (
                      <button
                        type="button"
                        onClick={() => onOpenAiStylist('stylist')}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C8B288]" />
                        <span>AI Suggest</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onFocusGiftTag}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Zoom to Tag in 3D</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#4F6D52] mb-3">
                  Your message inscribes live onto the cream-and-gold{' '}
                  <span className="font-serif italic text-[#17271C]">
                    FLOWER rchii
                  </span>{' '}
                  oval tag tied to the ribbon.
                </p>

                <div className="relative rounded-2xl border border-[#C8B288]/70 bg-[#FAF7F2] p-3 focus-within:ring-2 focus-within:ring-[#A7C0A8]">
                  <textarea
                    id="gift-note-input"
                    rows={3}
                    maxLength={MAX_GIFT_NOTE_LENGTH}
                    value={config.giftNote}
                    onChange={(e) => onChangeGiftNote(e.target.value)}
                    placeholder="Write a heartfelt note for the hanging bouquet tag..."
                    className="w-full resize-none bg-transparent text-sm text-[#17271C] placeholder:text-[#4F6D52]/55 focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-[#C8B288]/30 text-[11px] text-[#4F6D52] tabular-nums">
                    <span>Printed on 350gsm cotton-rag oval cardstock</span>
                    <span>
                      {remainingNoteChars} chars left
                    </span>
                  </div>
                </div>
              </div>

              {/* Luxury Add-Ons */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-serif text-xl text-[#17271C]">
                    Luxury Pairings
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
                          <div className="flex items-baseline gap-2">
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
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
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
                  ← Back to Blooms
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Summary Bar */}
      <div className="shrink-0 px-5 sm:px-7 py-4 bg-[#FAF7F2] border-t border-[#C8B288]/45">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#4F6D52] tabular-nums">
              <span>{pricing.totalStems} stems</span>
              {config.addons.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {config.addons.length} pairing
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
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#233A2A] disabled:opacity-45 text-xs sm:text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 shadow-[0_10px_24px_rgba(23,39,28,0.18)]"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>
              {canAdd ? 'Add Bouquet to Bag' : 'Add at least 1 stem'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
