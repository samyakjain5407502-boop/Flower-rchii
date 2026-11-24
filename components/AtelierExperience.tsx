'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
import {
  BouquetCanvas,
  type BouquetCanvasHandle,
} from './three/BouquetCanvas';
import { Navbar } from './Navbar';
import { EditorialHero } from './EditorialHero';
import {
  CustomizerPanel,
  type CustomizerStep,
  type DragBouquetItem,
  type QuickRefineAction,
} from './CustomizerPanel';
import { SignatureCollection } from './SignatureCollection';
import { BespokeConcierge } from './BespokeConcierge';
import { CartDrawer } from './CartDrawer';
import { AiFloristDrawer, type AiDrawerTab } from './AiFloristDrawer';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface AtelierExperienceProps {
  availableAssets?: AvailableOptionalAssets;
}

export function AtelierExperience({
  availableAssets = DEFAULT_AVAILABLE_ASSETS,
}: AtelierExperienceProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const [config, setConfig] = useState<BouquetConfig>(DEFAULT_BOUQUET);
  const [activeStep, setActiveStep] = useState<CustomizerStep>(2);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('front');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [isExportingCard, setIsExportingCard] = useState<boolean>(false);

  const [cartItems, setCartItems] = useState<CartBouquetItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [aiDrawerTab, setAiDrawerTab] = useState<AiDrawerTab>('stylist');
  const [aiSnapshot, setAiSnapshot] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick-Refine Smart Floral Stylist state
  const [quickRefineLoading, setQuickRefineLoading] =
    useState<QuickRefineAction | null>(null);
  const [quickRefineNote, setQuickRefineNote] = useState<string | null>(null);

  // Native HTML5 + Pointer Drag-and-Drop state
  const [activeDragItem, setActiveDragItem] = useState<DragBouquetItem | null>(
    null
  );
  const [isDragOverStage, setIsDragOverStage] = useState<boolean>(false);
  const [pointerDragPos, setPointerDragPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const canvasRef = useRef<BouquetCanvasHandle>(null);
  const stageDropRef = useRef<HTMLDivElement>(null);
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

  const handleChangeWrap = useCallback((wrapId: WrapId) => {
    setConfig((prev) => ({ ...prev, wrapId, presetName: undefined }));
  }, []);

  const handleChangeRibbon = useCallback((ribbonId: RibbonId) => {
    setConfig((prev) => ({ ...prev, ribbonId, presetName: undefined }));
  }, []);

  const handleAdjustStem = useCallback((bloomId: BloomId, delta: number) => {
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
  }, []);

  const applyDroppedItem = useCallback(
    (item: DragBouquetItem) => {
      if (item.kind === 'bloom') {
        handleAdjustStem(item.id as BloomId, 1);
        notify(`Added 1 ${item.label} to your bouquet`);
      } else if (item.kind === 'wrap') {
        handleChangeWrap(item.id as WrapId);
        notify(`Applied ${item.label}`);
      } else if (item.kind === 'ribbon') {
        handleChangeRibbon(item.id as RibbonId);
        notify(`Applied ${item.label}`);
      }
    },
    [handleAdjustStem, handleChangeWrap, handleChangeRibbon, notify]
  );

  const isPointerDragging = pointerDragPos !== null;

  // Lightweight pointer/touch drag listeners (active only while pointer-dragging from handle)
  useEffect(() => {
    if (!isPointerDragging || !activeDragItem) return;

    const isPointInsideStage = (clientX: number, clientY: number): boolean => {
      const rect = stageDropRef.current?.getBoundingClientRect();
      if (!rect) return false;
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    };

    const handleMove = (e: PointerEvent) => {
      setPointerDragPos({ x: e.clientX, y: e.clientY });
      setIsDragOverStage(isPointInsideStage(e.clientX, e.clientY));
    };

    const handleUp = (e: PointerEvent) => {
      if (isPointInsideStage(e.clientX, e.clientY)) {
        applyDroppedItem(activeDragItem);
      }
      setPointerDragPos(null);
      setActiveDragItem(null);
      setIsDragOverStage(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isPointerDragging, activeDragItem, applyDroppedItem]);

  const handlePointerDragStart = useCallback(
    (item: DragBouquetItem, event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setActiveDragItem(item);
      setPointerDragPos({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const handleStageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverStage) setIsDragOverStage(true);
  };

  const handleStageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (
      e.currentTarget &&
      e.relatedTarget instanceof Node &&
      e.currentTarget.contains(e.relatedTarget)
    ) {
      return;
    }
    setIsDragOverStage(false);
  };

  const handleStageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverStage(false);

    let dropped: DragBouquetItem | null = activeDragItem;
    const raw = e.dataTransfer.getData('application/x-flower-rchii');
    if (raw) {
      try {
        dropped = JSON.parse(raw) as DragBouquetItem;
      } catch {
        // Fallback to activeDragItem state
      }
    }

    if (dropped) {
      applyDroppedItem(dropped);
    }
    setActiveDragItem(null);
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

  const addBouquetConfigToBag = (
    bouquetConfig: BouquetConfig,
    customTitle?: string
  ) => {
    const pricing = getBouquetPricing(bouquetConfig);
    if (pricing.totalStems <= 0) return;

    const title = customTitle || bouquetConfig.presetName || 'Custom Bouquet';
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
    notify(`Loaded "${preset.name}" into your 3D bouquet`);
  };

  const handleShuffleSlots = () => {
    setShuffleSeed((s) => s + 1);
    notify('Rearranged flowers for a fresh look');
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
        notify('Please wait a moment for the 3D bouquet to finish loading');
        return;
      }
      await downloadBouquetPreviewCard(snapshot, config);
      notify('Bouquet preview card saved');
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

  const handleOpenAiStylist = useCallback((tab: AiDrawerTab) => {
    setAiDrawerTab(tab);
    const snap = canvasRef.current?.captureSnapshot() ?? null;
    if (snap) {
      setAiSnapshot(snap);
    }
    setAiDrawerOpen(true);
  }, []);

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
      notify(`Applied "${label}" to your bouquet`);
    },
    [notify]
  );

  // One-tap Smart Floral Stylist Quick-Refine buttons inside CustomizerPanel
  const handleQuickRefine = useCallback(
    async (action: QuickRefineAction) => {
      setQuickRefineLoading(action);
      try {
        const res = await fetch('/api/gemini/stylist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refineAction: action,
            budgetInr: action === 'under-1500' ? 1500 : null,
            previousSuggestion: config,
            currentConfig: config,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Could not update your bouquet.');
        }
        if (data.config) {
          handleApplyAiConfig(
            data.config as BouquetConfig,
            data.bouquetTitle || 'Smart Stylist Bouquet'
          );
          if (data.stylistNote) {
            setQuickRefineNote(String(data.stylistNote));
          }
        }
      } catch (err: unknown) {
        notify(
          err instanceof Error
            ? err.message
            : 'Unable to reach Smart Stylist right now'
        );
      } finally {
        setQuickRefineLoading(null);
      }
    },
    [config, handleApplyAiConfig, notify]
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

  const totalCartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

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
    notify('Bouquet details copied & opening WhatsApp');
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] flex flex-col bg-[#FAF7F2] text-[#17271C] overflow-x-clip">
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1 w-full max-w-[100vw]">
        {/* Section 1: Editorial Brand Hero ("The Bloom Iris") */}
        <EditorialHero
          availableAssets={availableAssets}
          onEnterAtelier={() => scrollToSection('atelier')}
          onExploreCollection={() => scrollToSection('collection')}
        />

        {/* Section 2: Interactive 3D Custom Bouquet Builder */}
        <section
          id="atelier"
          aria-label="Design Your Custom 3D Bouquet"
          className="relative w-full max-w-[100vw] border-b border-[#A7C0A8]/35 bg-[#FAF7F2]"
        >
          {/*
            Mobile (< 768px): Full-width vertical stacked layout — sticky compact 3D stage (h-[44vh] w-full) on top,
            full-width vertically scrolling customizer directly below.
            Desktop (>= 768px): Side-by-side 3D stage (left) + customizer (right) with ONE single <BouquetCanvas />.
          */}
          <div className="flex flex-col md:flex-row w-full max-w-full md:h-[calc(100vh-4rem)] md:min-h-[680px] md:max-h-[940px] md:overflow-hidden">
            {/* Single-Instance 3D Stage + Drag-and-Drop Zone */}
            <div
              ref={stageDropRef}
              onDragOver={handleStageDragOver}
              onDragLeave={handleStageDragLeave}
              onDrop={handleStageDrop}
              className="sticky top-16 z-20 h-[44vh] min-h-[290px] w-full shrink-0 border-b border-[#A7C0A8]/45 bg-[#FAF7F2] md:static md:top-auto md:z-auto md:w-[58%] lg:w-[60%] md:h-full md:border-b-0"
            >
              {isClient ? (
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
                  compactControls={false}
                />
              ) : (
                <div className="w-full h-full atelier-radial-stage flex flex-col items-center justify-center px-6 text-center">
                  <div className="w-16 h-20 rounded-full border border-[#C8B288]/70 flex items-center justify-center mb-4">
                    <Flower2 className="w-6 h-6 text-[#4F6D52]" />
                  </div>
                  <p className="font-serif text-xl text-[#17271C]">
                    Loading Your 3D Bouquet…
                  </p>
                  <p className="text-xs text-[#4F6D52] mt-1">
                    Setting up flowers, wrapping paper, and studio light
                  </p>
                </div>
              )}

              {/* Champagne Gold (#C8B288) Dashed Drop Glow Ring & Floating Hint */}
              <AnimatePresence>
                {activeDragItem && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className={`pointer-events-none absolute inset-2.5 sm:inset-4 z-30 rounded-3xl border-2 border-dashed border-[#C8B288] flex items-start justify-center pt-4 transition-colors ${
                      isDragOverStage
                        ? 'bg-[#EDE0C9]/28 shadow-[inset_0_0_44px_rgba(200,178,136,0.45),0_0_24px_rgba(200,178,136,0.35)]'
                        : 'bg-[#EDE0C9]/10 shadow-[inset_0_0_24px_rgba(200,178,136,0.28)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#17271C]/92 text-[#EDE0C9] border border-[#C8B288] shadow-lg text-xs font-medium tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-[#C8B288] shrink-0" />
                      <span>
                        {isDragOverStage
                          ? `Release to add ${activeDragItem.label}`
                          : 'Drop here to add to your bouquet'}
                      </span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Single-Instance Full-Width Customizer Panel */}
            <div className="w-full md:w-[42%] lg:w-[40%] md:h-full min-h-0">
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
                onQuickRefine={handleQuickRefine}
                quickRefineLoading={quickRefineLoading}
                quickRefineNote={quickRefineNote}
                onDragItemStart={setActiveDragItem}
                onDragItemEnd={() => {
                  setActiveDragItem(null);
                  setIsDragOverStage(false);
                }}
                onPointerDragStart={handlePointerDragStart}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Ready-Made Bouquets */}
        <div className="w-full max-w-[100vw] overflow-x-hidden">
          <SignatureCollection
            activePresetName={config.presetName}
            availableBouquetPhotos={availableAssets.bouquets}
            onSelectPreset={handleSelectPreset}
            onQuickAddPreset={handleQuickAddPreset}
          />
        </div>

        {/* Section 4: Custom Order Request */}
        <div className="w-full max-w-[100vw] overflow-x-hidden">
          <BespokeConcierge onNotify={notify} />
        </div>

        {/* Section 5: Simple Brand Promise Footer */}
        <section
          id="craft"
          className="w-full max-w-[100vw] overflow-x-hidden py-16 sm:py-20 px-5 sm:px-8 bg-[#17271C] text-[#EDE0C9]"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 pb-12 border-b border-[#C8B288]/20">
              <div className="space-y-2.5">
                <Flower2 className="w-5 h-5 text-[#C8B288]" />
                <h3 className="font-serif text-2xl text-[#FAF7F2]">
                  Hand-Arranged Fresh Flowers
                </h3>
                <p className="text-xs sm:text-sm text-[#EDE0C9]/75 leading-relaxed">
                  Every bouquet is arranged by hand so roses, peonies, and
                  lilies look full, balanced, and fresh from every angle.
                </p>
              </div>

              <div className="space-y-2.5">
                <Sparkles className="w-5 h-5 text-[#C8B288]" />
                <h3 className="font-serif text-2xl text-[#FAF7F2]">
                  Soft Matte Paper &amp; Ribbons
                </h3>
                <p className="text-xs sm:text-sm text-[#EDE0C9]/75 leading-relaxed">
                  Wrapped in thick matte paper and finished with soft satin or
                  sheer ribbons in our signature FLOWER rchii colors.
                </p>
              </div>

              <div className="space-y-2.5">
                <Gift className="w-5 h-5 text-[#C8B288]" />
                <h3 className="font-serif text-2xl text-[#FAF7F2]">
                  Personal Printed Gift Card
                </h3>
                <p className="text-xs sm:text-sm text-[#EDE0C9]/75 leading-relaxed">
                  Your message is printed neatly on a cream-and-gold gift card
                  tied to the bouquet and delivered fresh across Indore.
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
              <p>© {new Date().getFullYear()} FLOWER rchii Flower Studio</p>
            </div>
          </div>
        </section>
      </main>

      {/* Slide-Out Bag & Checkout Drawer */}
      <CartDrawer
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
        onNotify={notify}
      />

      {/* Smart Floral Stylist & Photo Help Drawer */}
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

      {/* Floating Touch/Pointer Drag Ghost Preview */}
      {pointerDragPos && activeDragItem && (
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(${pointerDragPos.x - 56}px, ${pointerDragPos.y - 24}px, 0)`,
          }}
          className="pointer-events-none fixed top-0 left-0 z-50 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288] shadow-xl text-xs font-medium whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C8B288] shrink-0" />
          <span>{activeDragItem.label}</span>
        </div>
      )}

      {/* Permanent Floating Quick-Action Dock: AI Florist + Order on WhatsApp */}
      {!cartOpen && !aiDrawerOpen && (
        <div className="fixed right-3.5 bottom-24 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenAiStylist('stylist')}
            aria-label="Open Smart Floral Stylist"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288] hover:bg-[#4F6D52] shadow-[0_10px_28px_rgba(23,39,28,0.28)] text-xs font-semibold tracking-wide transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8B288]"
          >
            <Sparkles className="w-4 h-4 text-[#C8B288] shrink-0" />
            <span>AI Florist</span>
          </button>

          <a
            href={floatingWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleFloatingWhatsAppClick}
            aria-label="Order your bouquet on WhatsApp"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#EDE0C9] text-[#17271C] border border-[#C8B288] hover:bg-[#FAF7F2] shadow-[0_10px_28px_rgba(23,39,28,0.22)] text-xs font-semibold tracking-wide transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6D52]"
          >
            <MessageCircle className="w-4 h-4 text-[#17271C] shrink-0" />
            <span className="hidden sm:inline">Order on WhatsApp</span>
          </a>
        </div>
      )}

      {/* Floating Confirmation Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/50 shadow-xl text-xs font-medium whitespace-nowrap max-w-[92vw] truncate"
          >
            <Check className="w-3.5 h-3.5 text-[#A7C0A8] shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
