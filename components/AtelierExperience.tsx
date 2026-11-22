'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Flower2, Gift, MessageCircle, Sparkles } from 'lucide-react';
import {
  DEFAULT_AVAILABLE_ASSETS,
  DEFAULT_BOUQUET,
  EMPTY_STEMS,
  MAX_GIFT_NOTE_LENGTH,
  MAX_TOTAL_STEMS,
  buildSingleBouquetWhatsAppMessage,
  buildWhatsAppUrl,
  getBouquetPricing,
  getTotalStems,
  type AddonId,
  type AvailableOptionalAssets,
  type BloomId,
  type BouquetConfig,
  type CameraPresetId,
  type CartBouquetItem,
  type RibbonId,
  type SignaturePreset,
  type WrapId,
} from '@/lib/bouquet-data';
import { downloadBouquetPreviewCard } from '@/lib/preview-card';
import type { BouquetCanvasHandle } from './three/BouquetCanvas';
import { Navbar } from './Navbar';
import { EditorialHero } from './EditorialHero';
import { CustomizerPanel, type CustomizerStep } from './CustomizerPanel';
import { SignatureCollection } from './SignatureCollection';
import { BespokeConcierge } from './BespokeConcierge';
import { CartDrawer } from './CartDrawer';
import { AiFloristDrawer, type AiDrawerTab } from './AiFloristDrawer';

const BouquetCanvas = dynamic(
  () => import('./three/BouquetCanvas').then((mod) => mod.BouquetCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full atelier-radial-stage flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-20 rounded-full border border-[#C8B288]/70 flex items-center justify-center mb-4">
          <Flower2 className="w-6 h-6 text-[#4F6D52]" />
        </div>
        <p className="font-serif text-xl text-[#17271C]">
          Preparing 3D Floral Atelier…
        </p>
        <p className="text-xs text-[#4F6D52] mt-1">
          Arranging botanical stems and studio lighting
        </p>
      </div>
    ),
  }
);

interface AtelierExperienceProps {
  availableAssets?: AvailableOptionalAssets;
}

export function AtelierExperience({
  availableAssets = DEFAULT_AVAILABLE_ASSETS,
}: AtelierExperienceProps) {
  const [config, setConfig] = useState<BouquetConfig>(DEFAULT_BOUQUET);
  const [activeStep, setActiveStep] = useState<CustomizerStep>(2);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('front');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [isExportingCard, setIsExportingCard] = useState<boolean>(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState<boolean>(false);

  const [cartItems, setCartItems] = useState<CartBouquetItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [aiDrawerTab, setAiDrawerTab] = useState<AiDrawerTab>('stylist');
  const [aiSnapshot, setAiSnapshot] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<BouquetCanvasHandle>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleChangeWrap = (wrapId: WrapId) => {
    setConfig((prev) => ({ ...prev, wrapId, presetName: undefined }));
  };

  const handleChangeRibbon = (ribbonId: RibbonId) => {
    setConfig((prev) => ({ ...prev, ribbonId, presetName: undefined }));
  };

  const handleAdjustStem = (bloomId: BloomId, delta: number) => {
    setConfig((prev) => {
      const current = prev.stems[bloomId] || 0;
      const total = getTotalStems(prev.stems);
      const next = current + delta;
      if (next < 0) return prev;
      if (delta > 0 && total >= MAX_TOTAL_STEMS) return prev;
      return {
        ...prev,
        presetName: undefined,
        stems: {
          ...prev.stems,
          [bloomId]: next,
        },
      };
    });
  };

  const handleResetStems = () => {
    setConfig((prev) => ({
      ...prev,
      presetName: undefined,
      stems: { ...EMPTY_STEMS },
    }));
  };

  const handleChangeGiftNote = (giftNote: string) => {
    setConfig((prev) => ({
      ...prev,
      giftNote: giftNote.slice(0, MAX_GIFT_NOTE_LENGTH),
    }));
  };

  const handleToggleAddon = (addonId: AddonId) => {
    setConfig((prev) => {
      const exists = prev.addons.includes(addonId);
      return {
        ...prev,
        addons: exists
          ? prev.addons.filter((id) => id !== addonId)
          : [...prev.addons, addonId],
      };
    });
  };

  const handleFocusGiftTag = () => {
    setAutoRotate(false);
    setCameraPreset('tag');
  };

  const addBouquetConfigToBag = (bouquetConfig: BouquetConfig, customTitle?: string) => {
    const pricing = getBouquetPricing(bouquetConfig);
    if (pricing.totalStems <= 0) return;

    const title = customTitle || bouquetConfig.presetName || 'Bespoke Atelier Bouquet';
    const newItem: CartBouquetItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      config: {
        ...bouquetConfig,
        stems: { ...bouquetConfig.stems },
        addons: [...bouquetConfig.addons],
      },
      unitPriceInr: pricing.grandTotal,
      quantity: 1,
      totalStems: pricing.totalStems,
    };

    setCartItems((prev) => [newItem, ...prev]);
    setCartOpen(true);
    notify(`Added "${title}" to your bag`);
  };

  const handleSelectPreset = (preset: SignaturePreset) => {
    setConfig({
      wrapId: preset.wrapId,
      ribbonId: preset.ribbonId,
      stems: { ...preset.stems },
      giftNote: preset.giftNote,
      addons: [...preset.addons],
      presetName: preset.name,
    });
    setShuffleSeed(0);
    setCameraPreset('front');
    scrollToSection('atelier');
    notify(`Loaded "${preset.name}" into 3D Atelier`);
  };

  const handleShuffleSlots = () => {
    setShuffleSeed((s) => s + 1);
    notify('Shuffled blooms across dome slots');
  };

  const handleQuickAddPreset = (preset: SignaturePreset) => {
    addBouquetConfigToBag(
      {
        wrapId: preset.wrapId,
        ribbonId: preset.ribbonId,
        stems: { ...preset.stems },
        giftNote: preset.giftNote,
        addons: [...preset.addons],
        presetName: preset.name,
      },
      preset.name
    );
  };

  const handleDownloadPreviewCard = async () => {
    if (!canvasRef.current) return;
    setIsExportingCard(true);
    try {
      const snapshot = canvasRef.current.captureSnapshot();
      if (!snapshot) {
        notify('Please wait a moment for the 3D bouquet to finish rendering');
        return;
      }
      await downloadBouquetPreviewCard(snapshot, config);
      notify('Bouquet studio preview card downloaded');
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleRefreshAiSnapshot = useCallback(() => {
    const snap = canvasRef.current?.captureSnapshot() ?? null;
    if (snap) {
      setAiSnapshot(snap);
    }
    return snap;
  }, []);

  const handleOpenAiStylist = useCallback(
    (tab: AiDrawerTab) => {
      setAiDrawerTab(tab);
      const snap = canvasRef.current?.captureSnapshot() ?? null;
      if (snap) {
        setAiSnapshot(snap);
      }
      setAiDrawerOpen(true);
    },
    []
  );

  const handleApplyAiConfig = useCallback(
    (nextConfig: BouquetConfig, label: string) => {
      setConfig({
        wrapId: nextConfig.wrapId,
        ribbonId: nextConfig.ribbonId,
        stems: { ...nextConfig.stems },
        giftNote: nextConfig.giftNote,
        addons: [...nextConfig.addons],
        presetName: label,
      });
      setShuffleSeed(0);
      setCameraPreset('front');
      notify(`Applied "${label}" to live 3D bouquet`);
    },
    [notify]
  );

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const floatingWhatsAppText = useMemo(
    () => buildSingleBouquetWhatsAppMessage(config),
    [config]
  );
  const floatingWhatsAppHref = useMemo(
    () => buildWhatsAppUrl(floatingWhatsAppText),
    [floatingWhatsAppText]
  );

  const handleFloatingWhatsAppClick = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(floatingWhatsAppText).catch(() => {});
    }
    notify('Custom bouquet summary copied & opening WhatsApp');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#17271C]">
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {/* Section 1: Editorial Brand Hero ("The Bloom Iris") */}
        <EditorialHero
          availableAssets={availableAssets}
          onEnterAtelier={() => scrollToSection('atelier')}
          onExploreCollection={() => scrollToSection('collection')}
        />

        {/* Section 2: Interactive 3D Custom Bouquet Builder ("The Atelier") */}
        <section
          id="atelier"
          aria-label="Interactive 3D Bouquet Atelier"
          className="relative w-full border-b border-[#A7C0A8]/35 bg-[#FAF7F2]"
        >
          {/*
            Desktop: 60% Interactive 3D Stage (left) + 40% 3-Step Customizer (right)
            Mobile: Top 45% live 3D bouquet visible while customizer acts as expandable bottom sheet
          */}
          <div className="flex flex-col lg:flex-row w-full h-[calc(100dvh-4rem)] min-h-[680px] lg:h-[calc(100vh-4rem)] lg:min-h-[700px] lg:max-h-[940px] overflow-hidden">
            {/* 3D Interactive Stage */}
            <div
              className={`relative w-full lg:w-[60%] lg:h-full transition-[height] duration-300 ease-out shrink-0 ${
                mobileSheetExpanded ? 'h-[32dvh]' : 'h-[45dvh]'
              }`}
            >
              <BouquetCanvas
                ref={canvasRef}
                config={config}
                cameraPreset={cameraPreset}
                onCameraPresetChange={setCameraPreset}
                autoRotate={autoRotate}
                onToggleAutoRotate={() => setAutoRotate((v) => !v)}
                shuffleSeed={shuffleSeed}
                onShuffle={handleShuffleSlots}
                onDownloadCard={handleDownloadPreviewCard}
                availableAssets={availableAssets}
                isExportingCard={isExportingCard}
                compactControls={mobileSheetExpanded}
              />
            </div>

            {/* Desktop Right Panel (40%) */}
            <div className="hidden lg:block lg:w-[40%] lg:h-full min-h-0">
              <CustomizerPanel
                config={config}
                activeStep={activeStep}
                onStepChange={setActiveStep}
                onChangeWrap={handleChangeWrap}
                onChangeRibbon={handleChangeRibbon}
                onAdjustStem={handleAdjustStem}
                onResetStems={handleResetStems}
                onChangeGiftNote={handleChangeGiftNote}
                onToggleAddon={handleToggleAddon}
                onFocusGiftTag={handleFocusGiftTag}
                onAddToBag={() => addBouquetConfigToBag(config)}
                onOpenAiStylist={handleOpenAiStylist}
              />
            </div>

            {/* Mobile Expandable Glassmorphic Bottom Sheet */}
            <div
              className={`lg:hidden relative z-20 -mt-5 flex-1 min-h-0 transition-all duration-300`}
            >
              <CustomizerPanel
                config={config}
                activeStep={activeStep}
                onStepChange={setActiveStep}
                onChangeWrap={handleChangeWrap}
                onChangeRibbon={handleChangeRibbon}
                onAdjustStem={handleAdjustStem}
                onResetStems={handleResetStems}
                onChangeGiftNote={handleChangeGiftNote}
                onToggleAddon={handleToggleAddon}
                onFocusGiftTag={handleFocusGiftTag}
                onAddToBag={() => addBouquetConfigToBag(config)}
                onOpenAiStylist={handleOpenAiStylist}
                isMobileSheet
                mobileExpanded={mobileSheetExpanded}
                onToggleMobileExpand={() =>
                  setMobileSheetExpanded((prev) => !prev)
                }
              />
            </div>
          </div>
        </section>

        {/* Section 3: Signature Pre-Made Collection */}
        <SignatureCollection
          activePresetName={config.presetName}
          availableBouquetPhotos={availableAssets.bouquets}
          onSelectPreset={handleSelectPreset}
          onQuickAddPreset={handleQuickAddPreset}
        />

        {/* Section 4: Bespoke Floral Concierge */}
        <BespokeConcierge onNotify={notify} />

        {/* Section 5: Quiet Editorial Craftsmanship Pillar */}
        <section
          id="craft"
          className="py-16 sm:py-20 px-5 sm:px-8 bg-[#17271C] text-[#EDE0C9]"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 pb-12 border-b border-[#C8B288]/20">
              <div className="space-y-2.5">
                <Flower2 className="w-5 h-5 text-[#C8B288]" />
                <h3 className="font-serif text-2xl text-[#FAF7F2]">
                  Golden-Angle Stem Architecture
                </h3>
                <p className="text-xs sm:text-sm text-[#EDE0C9]/75 leading-relaxed">
                  Every bouquet is hand-spiraled along natural phyllotaxis
                  angles so focal peonies, garden roses, and lilies breathe with
                  sculptural balance.
                </p>
              </div>

              <div className="space-y-2.5">
                <Sparkles className="w-5 h-5 text-[#C8B288]" />
                <h3 className="font-serif text-2xl text-[#FAF7F2]">
                  Signature Botanical Wrapping
                </h3>
                <p className="text-xs sm:text-sm text-[#EDE0C9]/75 leading-relaxed">
                  Folded in heavyweight matte cotton-rag sheets with satin silk
                  and sheer organza ribbons matched to the FLOWER rchii house
                  palette.
                </p>
              </div>

              <div className="space-y-2.5">
                <Gift className="w-5 h-5 text-[#C8B288]" />
                <h3 className="font-serif text-2xl text-[#FAF7F2]">
                  Gold-Bordered Cardstock Tag
                </h3>
                <p className="text-xs sm:text-sm text-[#EDE0C9]/75 leading-relaxed">
                  Each arrangement finishes with your custom note printed on an
                  oval champagne-foil tag and delivered chilled in our atelier
                  carriers.
                </p>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A7C0A8]">
              <div className="inline-flex items-baseline gap-1.5 text-[#EDE0C9]">
                <span className="font-serif text-lg tracking-[0.18em]">
                  FLOWER
                </span>
                <span className="font-script text-2xl text-[#C8B288] leading-none">
                  rchii
                </span>
                <span className="ml-3 text-[11px] tracking-[0.18em] text-[#A7C0A8]">
                  WHERE FLOWER IS BLOOM
                </span>
              </div>
              <p>© {new Date().getFullYear()} FLOWER rchii Floral Atelier</p>
            </div>
          </div>
        </section>
      </main>

      {/* Slide-Out Cart & Checkout Drawer */}
      <CartDrawer
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
        onNotify={notify}
      />

      {/* Gemini AI Floral Stylist & Bouquet Photo Studio Drawer */}
      <AiFloristDrawer
        open={aiDrawerOpen}
        activeTab={aiDrawerTab}
        onTabChange={setAiDrawerTab}
        liveSnapshot={aiSnapshot}
        onRefreshSnapshot={handleRefreshAiSnapshot}
        currentConfig={config}
        onClose={() => setAiDrawerOpen(false)}
        onApplyConfig={handleApplyAiConfig}
        onApplyGiftNote={handleChangeGiftNote}
        onDownloadPreviewCard={handleDownloadPreviewCard}
        onNotify={notify}
      />

      {/* Permanent Floating Quick-Action Dock: AI Florist + WhatsApp Order (clear of Navbar Bag & mobile customizer bar) */}
      {!cartOpen && !aiDrawerOpen && (
        <div className="fixed right-4 bottom-24 lg:bottom-6 lg:right-6 z-30 flex flex-col items-end gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenAiStylist('stylist')}
            aria-label="Open Gemini AI Floral Stylist and Bouquet Photo Studio"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288] hover:bg-[#4F6D52] shadow-[0_10px_28px_rgba(23,39,28,0.28)] text-xs font-semibold tracking-wide transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8B288]"
          >
            <Sparkles className="w-4 h-4 text-[#C8B288] shrink-0" />
            <span>AI Florist</span>
          </button>

          <a
            href={floatingWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleFloatingWhatsAppClick}
            aria-label="Order your custom bouquet on WhatsApp"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#EDE0C9] text-[#17271C] border border-[#C8B288] hover:bg-[#FAF7F2] shadow-[0_10px_28px_rgba(23,39,28,0.22)] text-xs font-semibold tracking-wide transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6D52]"
          >
            <MessageCircle className="w-4 h-4 text-[#17271C] shrink-0" />
            <span className="hidden sm:inline">WhatsApp Order</span>
          </a>
        </div>
      )}

      {/* Crisp Floating Confirmation Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/50 shadow-xl text-xs font-medium whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5 text-[#A7C0A8] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
