'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Copy,
  Flower2,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/bouquet-data';

interface BespokeConciergeProps {
  onNotify: (message: string) => void;
}

const OCCASION_OPTIONS = [
  'Birthday',
  'Anniversary / Proposal',
  'Wedding / Haldi',
  'Corporate Gifting',
  'Custom Budget Surprise',
] as const;

type OccasionOption = (typeof OCCASION_OPTIONS)[number];

function getDefaultConciergeDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function BespokeConcierge({ onNotify }: BespokeConciergeProps) {
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionOption>(
    'Anniversary / Proposal'
  );
  const [paletteInput, setPaletteInput] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<string>(getDefaultConciergeDate);
  const [deliveryArea, setDeliveryArea] = useState('');
  const [copied, setCopied] = useState(false);

  const inquiryText = useMemo(() => {
    const lines = [
      '*FLOWER rchii — Bespoke Floral Concierge Inquiry*',
      '_WHERE FLOWER IS BLOOM_',
      '',
      `*Occasion:* ${selectedOccasion}`,
      `*Preferred Palette / Blooms:* ${
        paletteInput.trim() || 'Open to master florist curation'
      }`,
      `*Customization Notes:* ${
        customNotes.trim() || 'Signature luxury styling & gift tag'
      }`,
      `*Preferred Delivery Date:* ${deliveryDate || 'Flexible'}`,
      `*Delivery Area:* ${deliveryArea.trim() || 'Indore (to be confirmed)'}`,
      '',
      'Please share bespoke options & pricing.',
    ];
    return lines.join('\n');
  }, [selectedOccasion, paletteInput, customNotes, deliveryDate, deliveryArea]);

  const whatsAppHref = useMemo(
    () => buildWhatsAppUrl(inquiryText),
    [inquiryText]
  );

  const handleWhatsAppClick = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inquiryText).catch(() => {});
    }
    onNotify('Bespoke inquiry prepared for WhatsApp — our florists await');
  };

  const handleCopyInquiry = async () => {
    try {
      await navigator.clipboard.writeText(inquiryText);
      setCopied(true);
      onNotify('Custom concierge inquiry copied to clipboard');
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      onNotify('Ready to send on WhatsApp');
    }
  };

  return (
    <section
      id="concierge"
      aria-label="Bespoke Floral Concierge"
      className="py-16 sm:py-24 px-5 sm:px-8 bg-[#EBF1EC] border-t border-[#A7C0A8]/45"
    >
      <div className="max-w-[1120px] mx-auto">
        {/* Editorial Header with Thin Champagne-Gold Oval Arch Accent */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center mb-10 sm:mb-12"
        >
          <div className="relative inline-flex items-center justify-center w-14 h-20 rounded-full border border-[#C8B288] bg-[#FAF7F2] mb-5 shadow-[0_6px_20px_rgba(23,39,28,0.06)]">
            <div className="w-11 h-16 rounded-full border border-[#EDE0C9] flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-[#4F6D52]" />
            </div>
          </div>

          <p className="text-xs tracking-[0.26em] text-[#4F6D52] font-medium mb-2.5">
            BESPOKE FLORAL CONCIERGE
          </p>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[46px] leading-[1.08] text-[#17271C] text-balance max-w-2xl mb-4">
            Have Something Extraordinary in Mind?
          </h2>

          <p className="text-sm sm:text-base text-[#4F6D52] max-w-2xl leading-relaxed">
            From 100-stem proposals and rare imported blooms to custom-budget
            surprises—tell our master florists your vision.
          </p>
        </motion.div>

        {/* Interactive Bespoke Request Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[32px] p-6 sm:p-10 bg-[#FAF7F2] border border-[#C8B288]/70 shadow-[0_18px_50px_rgba(23,39,28,0.08)]"
        >
          {/* Inner subtle double-border champagne hairline */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2.5 rounded-[24px] border border-[#A7C0A8]/35"
          />

          <div className="relative z-10 space-y-7">
            {/* Occasion Quick-Pills */}
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#17271C] mb-3">
                Select Occasion
              </p>
              <div className="flex flex-wrap gap-2">
                {OCCASION_OPTIONS.map((occasion) => {
                  const active = selectedOccasion === occasion;
                  return (
                    <button
                      key={occasion}
                      type="button"
                      onClick={() => setSelectedOccasion(occasion)}
                      className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
                        active
                          ? 'bg-[#17271C] text-[#EDE0C9] border-[#17271C] shadow-sm'
                          : 'bg-[#EBF1EC]/70 text-[#17271C] border-[#A7C0A8]/60 hover:border-[#4F6D52] hover:bg-[#EBF1EC]'
                      }`}
                    >
                      {occasion}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred Color Palette / Flowers Input */}
            <div>
              <label
                htmlFor="concierge-palette"
                className="block text-xs font-semibold tracking-wide text-[#17271C] mb-2"
              >
                Preferred Color Palette / Flowers
              </label>
              <input
                id="concierge-palette"
                type="text"
                value={paletteInput}
                onChange={(e) => setPaletteInput(e.target.value)}
                placeholder="Pastel peach & white orchids, or ₹3,500 surprise arrangement"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF7F2] border border-[#A7C0A8]/70 text-sm text-[#17271C] placeholder:text-[#4F6D52]/55 focus:outline-none focus:ring-2 focus:ring-[#4F6D52] focus:border-[#4F6D52] transition-shadow"
              />
            </div>

            {/* Special Customization Notes */}
            <div>
              <label
                htmlFor="concierge-notes"
                className="block text-xs font-semibold tracking-wide text-[#17271C] mb-2"
              >
                Special Customization Notes
              </label>
              <textarea
                id="concierge-notes"
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Polaroid photos attached, midnight delivery, specific wrapping style, or custom bouquet size..."
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF7F2] border border-[#A7C0A8]/70 text-sm text-[#17271C] placeholder:text-[#4F6D52]/55 focus:outline-none focus:ring-2 focus:ring-[#4F6D52] focus:border-[#4F6D52] resize-none leading-relaxed transition-shadow"
              />
            </div>

            {/* Delivery Date & Area (Indore / Custom) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="concierge-date"
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#17271C] mb-2"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#4F6D52]" />
                  <span>Delivery Date</span>
                </label>
                <input
                  id="concierge-date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAF7F2] border border-[#A7C0A8]/70 text-sm text-[#17271C] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#4F6D52] focus:border-[#4F6D52]"
                />
              </div>

              <div>
                <label
                  htmlFor="concierge-area"
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#17271C] mb-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#4F6D52]" />
                  <span>Delivery Area (Indore / Custom)</span>
                </label>
                <input
                  id="concierge-area"
                  type="text"
                  value={deliveryArea}
                  onChange={(e) => setDeliveryArea(e.target.value)}
                  placeholder="Vijay Nagar, Saket, Palasia — Indore"
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAF7F2] border border-[#A7C0A8]/70 text-sm text-[#17271C] placeholder:text-[#4F6D52]/55 focus:outline-none focus:ring-2 focus:ring-[#4F6D52] focus:border-[#4F6D52]"
                />
              </div>
            </div>

            {/* WhatsApp Inquiry CTA Row */}
            <div className="pt-3 border-t border-[#C8B288]/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-xs text-[#4F6D52] leading-relaxed">
                Direct reply from our Indore master florists with seasonal stem
                availability and custom pricing.
              </p>

              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#17271C] text-[#EDE0C9] hover:bg-[#4F6D52] hover:text-[#FAF7F2] text-xs sm:text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shadow-[0_10px_24px_rgba(23,39,28,0.16)]"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Send Custom Request on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyInquiry}
                  title="Copy custom request summary"
                  aria-label="Copy custom request summary"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-full border border-[#A7C0A8] bg-[#EBF1EC]/70 text-[#17271C] hover:bg-[#EDE0C9]/55 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-[#4F6D52]" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
