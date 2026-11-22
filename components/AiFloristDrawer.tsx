'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Camera,
  Check,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ADDON_OPTIONS,
  BLOOM_MAP,
  BLOOMS,
  formatINR,
  getBouquetPricing,
  getRibbonById,
  getWrapById,
  type BouquetConfig,
} from '@/lib/bouquet-data';

export type AiDrawerTab = 'stylist' | 'photo';

interface AiStylistResult {
  bouquetTitle: string;
  stylistNote: string;
  photoStylingTip: string;
  config: BouquetConfig;
}

interface AiPhotoCritiqueResult {
  harmonyScore: number;
  visualVerdict: string;
  floristFeedback: string;
  suggestedImprovements: string[];
  enhancedCaption: string;
  refinedConfig: BouquetConfig;
}

interface AiFloristDrawerProps {
  open: boolean;
  activeTab: AiDrawerTab;
  onTabChange: (tab: AiDrawerTab) => void;
  liveSnapshot: string | null;
  onRefreshSnapshot: () => string | null;
  currentConfig: BouquetConfig;
  onClose: () => void;
  onApplyConfig: (nextConfig: BouquetConfig, label: string) => void;
  onApplyGiftNote: (note: string) => void;
  onDownloadPreviewCard: () => void;
  onNotify: (msg: string) => void;
}

const OCCASION_CHIPS = [
  'Romantic Proposal',
  'Birthday Surprise',
  'Anniversary',
  'Heartfelt Apology',
  'Pastel Aesthetic',
  'Festive Celebration',
];

const BUDGET_CHIPS: { label: string; value: number | null }[] = [
  { label: '₹1,500', value: 1500 },
  { label: '₹2,500', value: 2500 },
  { label: '₹4,000', value: 4000 },
  { label: 'Flexible', value: null },
];

/** Downscales user-uploaded inspiration photo to <=1024px JPEG for fast multimodal upload */
async function compressImageFile(file: File): Promise<{
  dataUrl: string;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxDim = 1024;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: String(reader.result),
            mimeType: file.type || 'image/jpeg',
          });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.84);
        resolve({ dataUrl: compressed, mimeType: 'image/jpeg' });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function AiFloristDrawer({
  open,
  activeTab,
  onTabChange,
  liveSnapshot,
  onRefreshSnapshot,
  currentConfig,
  onClose,
  onApplyConfig,
  onApplyGiftNote,
  onDownloadPreviewCard,
  onNotify,
}: AiFloristDrawerProps) {
  // Tab 1: AI Stylist & Photo-to-Bouquet Matcher state
  const [occasion, setOccasion] = useState<string>('');
  const [budgetInr, setBudgetInr] = useState<number | null>(2500);
  const [prompt, setPrompt] = useState<string>('');
  const [refPhotoDataUrl, setRefPhotoDataUrl] = useState<string | null>(null);
  const [refPhotoMime, setRefPhotoMime] = useState<string>('image/jpeg');
  const [stylistLoading, setStylistLoading] = useState<boolean>(false);
  const [stylistError, setStylistError] = useState<string | null>(null);
  const [stylistResult, setStylistResult] = useState<AiStylistResult | null>(null);

  // Tab 2: Live Bouquet Photo Critique state
  const [photoQuestion, setPhotoQuestion] = useState<string>('');
  const [photoLoading, setPhotoLoading] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<AiPhotoCritiqueResult | null>(null);
  const [captionCopied, setCaptionCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escape key closes drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleUploadReferencePhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStylistError(null);
    try {
      const { dataUrl, mimeType } = await compressImageFile(file);
      setRefPhotoDataUrl(dataUrl);
      setRefPhotoMime(mimeType);
    } catch (err: unknown) {
      setStylistError(
        err instanceof Error ? err.message : 'Unable to process image.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAskStylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !occasion && !refPhotoDataUrl) {
      setStylistError(
        'Choose an occasion, describe your vibe, or upload an inspiration photo.'
      );
      return;
    }

    setStylistLoading(true);
    setStylistError(null);

    try {
      const res = await fetch('/api/gemini/stylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          occasion,
          budgetInr,
          referenceImageBase64: refPhotoDataUrl ?? undefined,
          referenceMimeType: refPhotoDataUrl ? refPhotoMime : undefined,
          currentConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate bouquet suggestion.');
      }
      setStylistResult(data as AiStylistResult);
    } catch (err: unknown) {
      setStylistError(
        err instanceof Error
          ? err.message
          : 'Unable to reach AI Floral Stylist right now.'
      );
    } finally {
      setStylistLoading(false);
    }
  };

  const handleRefreshLiveSnapshot = () => {
    const snap = onRefreshSnapshot();
    if (snap) {
      setPhotoError(null);
      onNotify('Captured fresh 3D bouquet snapshot');
    } else {
      setPhotoError('3D bouquet preview is still preparing. Try again in a moment.');
    }
  };

  const handleAnalyzeBouquetPhoto = async () => {
    const snap = liveSnapshot || onRefreshSnapshot();
    if (!snap) {
      setPhotoError(
        'Please wait a moment for the 3D bouquet stage to finish rendering, then capture again.'
      );
      return;
    }
    setPhotoLoading(true);
    setPhotoError(null);

    try {
      const res = await fetch('/api/gemini/bouquet-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: snap,
          mimeType: 'image/png',
          config: currentConfig,
          userQuestion: photoQuestion.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not analyze bouquet photo.');
      }
      setPhotoResult(data as AiPhotoCritiqueResult);
    } catch (err: unknown) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : 'Unable to analyze bouquet photo right now.'
      );
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleCopyCaption = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCaptionCopied(true);
    onNotify('Editorial caption copied');
    window.setTimeout(() => setCaptionCopied(false), 1800);
  };

  const stylistPricing = stylistResult
    ? getBouquetPricing(stylistResult.config)
    : null;
  const refinedPricing = photoResult
    ? getBouquetPricing(photoResult.refinedConfig)
    : null;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="FLOWER rchii Gemini AI Floral Stylist"
        >
          {/* Forest-tinted backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#17271C]/50 backdrop-blur-[2px]"
          />

          {/* Slide-over drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[470px] h-full bg-[#FAF7F2] text-[#17271C] border-l border-[#C8B288]/60 shadow-[-16px_0_48px_rgba(23,39,28,0.24)] flex flex-col"
          >
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5 pb-4 bg-[#17271C] text-[#EDE0C9] border-b border-[#C8B288]/40 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[#C8B288] font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gemini Floral Concierge</span>
                  </div>
                  <h2 className="font-serif text-2xl text-[#FAF7F2] mt-0.5 leading-tight">
                    AI Stylist &amp; Photo Studio
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close AI Floral Stylist"
                  className="w-9 h-9 rounded-full border border-[#C8B288]/45 text-[#EDE0C9] hover:bg-[#4F6D52] flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Two Mode Tabs */}
              <div
                role="tablist"
                aria-label="AI Floral Stylist tools"
                className="grid grid-cols-2 gap-1.5 p-1 mt-4 rounded-full bg-[#24392A] border border-[#C8B288]/30"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'stylist'}
                  onClick={() => onTabChange('stylist')}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-medium transition-colors ${
                    activeTab === 'stylist'
                      ? 'bg-[#EDE0C9] text-[#17271C] shadow-sm'
                      : 'text-[#EDE0C9]/80 hover:text-[#FAF7F2]'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Suggest &amp; Match Photo</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'photo'}
                  onClick={() => {
                    onTabChange('photo');
                    onRefreshSnapshot();
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-medium transition-colors ${
                    activeTab === 'photo'
                      ? 'bg-[#EDE0C9] text-[#17271C] shadow-sm'
                      : 'text-[#EDE0C9]/80 hover:text-[#FAF7F2]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>Bouquet Photo Review</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto atelier-scroll px-5 sm:px-6 py-5 space-y-5">
              {activeTab === 'stylist' ? (
                <>
                  <form onSubmit={handleAskStylist} className="space-y-4">
                    {/* Occasion Chips */}
                    <div>
                      <p className="text-xs font-semibold text-[#17271C] mb-2">
                        1. Occasion or Vibe
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {OCCASION_CHIPS.map((chip) => {
                          const active = occasion === chip;
                          return (
                            <button
                              key={chip}
                              type="button"
                              onClick={() =>
                                setOccasion(active ? '' : chip)
                              }
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                active
                                  ? 'bg-[#17271C] text-[#EDE0C9] border-[#C8B288]'
                                  : 'bg-[#EBF1EC] text-[#17271C] border-[#A7C0A8]/55 hover:border-[#4F6D52]'
                              }`}
                            >
                              {chip}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Budget Chips */}
                    <div>
                      <p className="text-xs font-semibold text-[#17271C] mb-2">
                        2. Target Budget (INR)
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {BUDGET_CHIPS.map((b) => {
                          const active = budgetInr === b.value;
                          return (
                            <button
                              key={b.label}
                              type="button"
                              onClick={() => setBudgetInr(b.value)}
                              className={`py-1.5 px-2 rounded-full text-xs font-medium border tabular-nums transition-colors ${
                                active
                                  ? 'bg-[#4F6D52] text-[#FAF7F2] border-[#4F6D52]'
                                  : 'bg-[#FAF7F2] text-[#17271C] border-[#A7C0A8]/60 hover:bg-[#EBF1EC]'
                              }`}
                            >
                              {b.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Optional Reference Photo Matcher */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[#17271C]">
                          3. Upload Inspiration Photo{' '}
                          <span className="font-normal text-[#4F6D52]">
                            (Optional)
                          </span>
                        </p>
                        {refPhotoDataUrl && (
                          <button
                            type="button"
                            onClick={() => setRefPhotoDataUrl(null)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#7F1D2B] hover:underline"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadReferencePhoto}
                        className="hidden"
                      />

                      {refPhotoDataUrl ? (
                        <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-[#C8B288]/70 bg-[#EBF1EC]/65">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={refPhotoDataUrl}
                            alt="Uploaded bouquet inspiration reference"
                            className="w-16 h-16 rounded-xl object-cover border border-[#C8B288]/55 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#17271C]">
                              Reference photo attached
                            </p>
                            <p className="text-[11px] text-[#4F6D52] mt-0.5 leading-snug">
                              Gemini will match its color palette, stems, and
                              wrap inside the 3D Atelier.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-dashed border-[#A7C0A8] bg-[#EBF1EC]/50 hover:bg-[#EBF1EC] text-xs font-medium text-[#17271C] transition-colors"
                        >
                          <ImagePlus className="w-4 h-4 text-[#4F6D52] shrink-0" />
                          <span>
                            Upload a bouquet or outfit photo to match in 3D
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Text Prompt (English / Hindi / Hinglish) */}
                    <div>
                      <label
                        htmlFor="ai-stylist-prompt"
                        className="block text-xs font-semibold text-[#17271C] mb-1.5"
                      >
                        4. Tell Our Florist (English / Hinglish)
                      </label>
                      <textarea
                        id="ai-stylist-prompt"
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Anniversary ke liye soft blush & white bouquet chahiye, romantic gift note ke saath..."
                        className="w-full rounded-2xl border border-[#C8B288]/70 bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#17271C] placeholder:text-[#4F6D52]/60 focus:outline-none focus:ring-2 focus:ring-[#A7C0A8] resize-none"
                      />
                    </div>

                    {stylistError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-[#7F1D2B]/10 border border-[#7F1D2B]/30 text-xs text-[#7F1D2B]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{stylistError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={stylistLoading}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/70 hover:bg-[#4F6D52] disabled:opacity-55 text-xs sm:text-sm font-semibold tracking-wide transition-colors shadow-[0_10px_24px_rgba(23,39,28,0.16)]"
                    >
                      {stylistLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Curating Your Bespoke Bouquet…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-[#C8B288]" />
                          <span>Suggest Bouquet with Gemini AI</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Stylist Recommendation Card */}
                  {stylistResult && stylistPricing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-[#C8B288]/80 bg-[#EBF1EC]/65 p-4 space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#4F6D52] font-semibold">
                            Curated Recommendation
                          </p>
                          <h3 className="font-serif text-xl text-[#17271C] leading-snug">
                            {stylistResult.bouquetTitle}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-serif text-xl font-semibold text-[#17271C] tabular-nums">
                            {formatINR(stylistPricing.grandTotal)}
                          </p>
                          <p className="text-[11px] text-[#4F6D52] tabular-nums">
                            {stylistPricing.totalStems} stems
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#17271C]/85 leading-relaxed">
                        {stylistResult.stylistNote}
                      </p>

                      {/* Wrap & Ribbon Summary */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/45 px-3 py-2">
                          <span className="text-[#4F6D52] block">Wrap</span>
                          <span className="font-semibold text-[#17271C]">
                            {getWrapById(stylistResult.config.wrapId).name}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/45 px-3 py-2">
                          <span className="text-[#4F6D52] block">Ribbon</span>
                          <span className="font-semibold text-[#17271C]">
                            {getRibbonById(stylistResult.config.ribbonId).name}
                          </span>
                        </div>
                      </div>

                      {/* Stems Breakdown */}
                      <div className="flex flex-wrap gap-1.5">
                        {BLOOMS.filter(
                          (b) => (stylistResult.config.stems[b.id] || 0) > 0
                        ).map((b) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#A7C0A8]/55 text-[11px] text-[#17271C]"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-[#C8B288]/70 shrink-0"
                              style={{ backgroundColor: b.swatchPrimary }}
                            />
                            <span className="font-semibold tabular-nums">
                              {stylistResult.config.stems[b.id]}×
                            </span>
                            <span>{b.name}</span>
                          </span>
                        ))}
                        {stylistResult.config.addons.map((addonId) => {
                          const addon = ADDON_OPTIONS.find(
                            (a) => a.id === addonId
                          );
                          if (!addon) return null;
                          return (
                            <span
                              key={addon.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDE0C9]/70 border border-[#C8B288]/70 text-[11px] font-medium text-[#17271C]"
                            >
                              + {addon.name}
                            </span>
                          );
                        })}
                      </div>

                      {/* Gift Tag Preview */}
                      <div className="rounded-xl bg-[#FAF7F2] border border-[#C8B288]/65 px-3.5 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#4F6D52] font-semibold">
                          Suggested Gift Tag Note
                        </p>
                        <p className="font-serif italic text-sm text-[#17271C] mt-1">
                          “{stylistResult.config.giftNote}”
                        </p>
                      </div>

                      {/* Photo Styling Tip */}
                      {stylistResult.photoStylingTip && (
                        <p className="text-[11px] text-[#4F6D52] leading-relaxed">
                          <span className="font-semibold text-[#17271C]">
                            Photo Styling Tip:{' '}
                          </span>
                          {stylistResult.photoStylingTip}
                        </p>
                      )}

                      {/* Apply Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onApplyConfig(
                              stylistResult.config,
                              stylistResult.bouquetTitle
                            );
                            onClose();
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/70 hover:bg-[#4F6D52] text-xs font-semibold transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Apply to Live 3D Bouquet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onApplyGiftNote(stylistResult.config.giftNote);
                            onNotify('Applied AI gift note to hanging tag');
                          }}
                          className="py-2.5 px-3.5 rounded-full border border-[#A7C0A8] bg-[#FAF7F2] text-[#17271C] hover:bg-[#EBF1EC] text-xs font-medium transition-colors"
                        >
                          Use Note Only
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                /* === TAB 2: LIVE BOUQUET PHOTO CRITIQUE & STUDIO CARD === */
                <div className="space-y-4">
                  {/* Live Snapshot Frame */}
                  <div className="rounded-2xl border border-[#C8B288]/75 bg-[#EBF1EC]/55 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#17271C]">
                        Live 3D Bouquet Snapshot
                      </span>
                      <button
                        type="button"
                        onClick={handleRefreshLiveSnapshot}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4F6D52] hover:text-[#17271C] transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh Photo</span>
                      </button>
                    </div>

                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#A7C0A8]/50 flex items-center justify-center">
                      {liveSnapshot ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={liveSnapshot}
                          alt="Current custom FLOWER rchii 3D bouquet snapshot"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center px-4">
                          <Camera className="w-7 h-7 text-[#4F6D52] mx-auto mb-1.5" />
                          <p className="text-xs text-[#4F6D52]">
                            Tap “Refresh Photo” to capture your current 3D
                            bouquet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional specific question */}
                  <div>
                    <label
                      htmlFor="ai-photo-question"
                      className="block text-xs font-semibold text-[#17271C] mb-1.5"
                    >
                      Ask Gemini About Your Bouquet Photo{' '}
                      <span className="font-normal text-[#4F6D52]">
                        (Optional)
                      </span>
                    </label>
                    <input
                      id="ai-photo-question"
                      type="text"
                      value={photoQuestion}
                      onChange={(e) => setPhotoQuestion(e.target.value)}
                      placeholder="e.g. Kya isme wrap aur rich lag sakta hai?"
                      className="w-full rounded-full border border-[#C8B288]/70 bg-[#FAF7F2] px-4 py-2.5 text-xs sm:text-sm text-[#17271C] placeholder:text-[#4F6D52]/60 focus:outline-none focus:ring-2 focus:ring-[#A7C0A8]"
                    />
                  </div>

                  {photoError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-[#7F1D2B]/10 border border-[#7F1D2B]/30 text-xs text-[#7F1D2B]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{photoError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={photoLoading}
                      onClick={handleAnalyzeBouquetPhoto}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/70 hover:bg-[#4F6D52] disabled:opacity-55 text-xs font-semibold tracking-wide transition-colors"
                    >
                      {photoLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Inspecting Bouquet Photo…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-[#C8B288]" />
                          <span>Analyze &amp; Polish Bouquet</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={onDownloadPreviewCard}
                      className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-full border border-[#A7C0A8] bg-[#FAF7F2] text-[#17271C] hover:bg-[#EBF1EC] text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#4F6D52]" />
                      <span>Save Card</span>
                    </button>
                  </div>

                  {/* Photo Critique Results */}
                  {photoResult && refinedPricing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-[#C8B288]/80 bg-[#EBF1EC]/65 p-4 space-y-3.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#4F6D52] font-semibold">
                            Master Florist Review
                          </p>
                          <h3 className="font-serif text-xl text-[#17271C] leading-snug">
                            {photoResult.visualVerdict}
                          </h3>
                        </div>
                        <div className="shrink-0 px-3 py-1.5 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/70 text-center">
                          <span className="text-sm font-semibold tabular-nums">
                            {photoResult.harmonyScore}
                          </span>
                          <span className="text-[10px] text-[#C8B288]">
                            /100
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#17271C]/85 leading-relaxed">
                        {photoResult.floristFeedback}
                      </p>

                      {photoResult.suggestedImprovements.length > 0 && (
                        <ul className="space-y-1.5">
                          {photoResult.suggestedImprovements.map((tip, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-[#17271C]"
                            >
                              <span className="w-4 h-4 rounded-full bg-[#4F6D52] text-[#FAF7F2] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-snug">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Shareable Editorial Caption */}
                      {photoResult.enhancedCaption && (
                        <div className="rounded-xl bg-[#FAF7F2] border border-[#C8B288]/60 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-[0.16em] text-[#4F6D52] font-semibold">
                              Photo Caption Ready to Share
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyCaption(photoResult.enhancedCaption)
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4F6D52] hover:text-[#17271C]"
                            >
                              {captionCopied ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{captionCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <p className="font-serif italic text-sm text-[#17271C]">
                            “{photoResult.enhancedCaption}”
                          </p>
                        </div>
                      )}

                      {/* 1-click AI Polish Preview */}
                      <div className="rounded-xl bg-[#FAF7F2] border border-[#A7C0A8]/55 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#17271C]">
                            AI-Polished Upgrade
                          </span>
                          <span className="text-[#4F6D52] font-semibold tabular-nums">
                            {refinedPricing.totalStems} stems ·{' '}
                            {formatINR(refinedPricing.grandTotal)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(photoResult.refinedConfig.stems)
                            .filter(([, count]) => count > 0)
                            .map(([id, count]) => {
                              const bloom =
                                BLOOM_MAP[id as keyof typeof BLOOM_MAP];
                              if (!bloom) return null;
                              return (
                                <span
                                  key={id}
                                  className="px-2 py-0.5 rounded-full bg-[#EBF1EC] text-[11px] text-[#17271C]"
                                >
                                  {count}× {bloom.name}
                                </span>
                              );
                            })}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onApplyConfig(
                              photoResult.refinedConfig,
                              photoResult.refinedConfig.presetName ||
                                'AI Polished Bouquet'
                            );
                            onClose();
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-[#4F6D52] text-[#FAF7F2] hover:bg-[#17271C] text-xs font-semibold transition-colors"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Apply AI Polish to 3D Bouquet</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
