/**
 * Single source of truth for FLOWER rchii products, pricing, asset paths,
 * fixed 36-slot bouquet dome layout, and WhatsApp ordering configuration.
 */

/** Store WhatsApp number in E.164 digits only (no + or spaces). Replace with your live number. */
export const WHATSAPP_NUMBER = '919876543210';

export type BloomId =
  | 'red-rose'
  | 'blush-rose'
  | 'peony'
  | 'tulip'
  | 'lily'
  | 'babys-breath'
  | 'eucalyptus';

export type WrapId = 'light-sage' | 'champagne-cream' | 'deep-forest';
export type RibbonId = 'champagne-gold' | 'forest-emerald' | 'soft-sage';
export type AddonId = 'dark-chocolates' | 'soy-candle';
export type CameraPresetId = 'front' | 'editorial' | 'top' | 'tag';

export interface BloomDefinition {
  id: BloomId;
  name: string;
  botanicalNote: string;
  priceInr: number;
  swatchPrimary: string;
  swatchSecondary: string;
  role: 'focal' | 'accent' | 'filler' | 'foliage';
  /** Transparent PNG path under /public/flowers/ (45° top-front studio pose) */
  imagePath: string;
  /** Per-flower visual scale applied after square bounding-box normalization */
  spriteScale: number;
  heightBias: number;
  radiusWeight: number;
}

export interface WrapOption {
  id: WrapId;
  name: string;
  subtitle: string;
  outerColor: string;
  innerColor: string;
  roughness: number;
  metalness: number;
  edgeTrimColor: string;
  /** Optional real-photo transparent PNG of Korean-style wrap base (front view) */
  photoPath: string;
}

export interface RibbonOption {
  id: RibbonId;
  name: string;
  subtitle: string;
  color: string;
  roughness: number;
  metalness: number;
  sheen: number;
  opacity: number;
  /** Optional real-photo transparent PNG of tied ribbon bow (front view) */
  photoPath: string;
}

export interface AddonOption {
  id: AddonId;
  name: string;
  description: string;
  priceInr: number;
  accentColor: string;
}

export interface SignaturePreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  wrapId: WrapId;
  ribbonId: RibbonId;
  stems: Record<BloomId, number>;
  addons: AddonId[];
  giftNote: string;
  palette: string[];
  /** Optional real photograph path under /public/bouquets/<id>.jpg */
  photoPath: string;
}

export interface BouquetSlot {
  index: number;
  ring: 1 | 2 | 3;
  /** 'focal' slots form the lush crown & mid-dome; 'behind' slots tuck behind/perimeter for foliage & fillers */
  zone: 'focal' | 'behind';
  x: number;
  y: number;
  z: number;
  scale: number;
  /** Roll rotation in radians */
  rotation: number;
  /** Outward tilt in degrees (10°–40°) */
  tilt: number;
}

export interface AvailableOptionalAssets {
  wraps: Record<WrapId, boolean>;
  ribbons: Record<RibbonId, boolean>;
  bouquets: Record<string, boolean>;
  /** True when /public/hero/bloom-001.webp through bloom-036.webp exist */
  heroBloomFrames: boolean;
  /** Optional story panel photographs under /public/story/{choose,arrange,gift}.jpg */
  storyPhotos: {
    choose: boolean;
    arrange: boolean;
    gift: boolean;
  };
}

export const DEFAULT_AVAILABLE_ASSETS: AvailableOptionalAssets = {
  wraps: {
    'light-sage': false,
    'champagne-cream': false,
    'deep-forest': false,
  },
  ribbons: {
    'champagne-gold': false,
    'forest-emerald': false,
    'soft-sage': false,
  },
  bouquets: {},
  heroBloomFrames: false,
  storyPhotos: {
    choose: false,
    arrange: false,
    gift: false,
  },
};

export interface BouquetConfig {
  wrapId: WrapId;
  ribbonId: RibbonId;
  stems: Record<BloomId, number>;
  giftNote: string;
  addons: AddonId[];
  presetName?: string;
}

export interface CartBouquetItem {
  id: string;
  title: string;
  config: BouquetConfig;
  unitPriceInr: number;
  quantity: number;
  totalStems: number;
}

export const MAX_TOTAL_STEMS = 36;
export const MAX_GIFT_NOTE_LENGTH = 120;
export const DELIVERY_FEE_INR = 150;
export const FREE_DELIVERY_THRESHOLD_INR = 2500;

export const BLOOMS: BloomDefinition[] = [
  {
    id: 'red-rose',
    name: 'Red Rose',
    botanicalNote: 'Rich deep-red rose with soft petals',
    priceInr: 120,
    swatchPrimary: '#7F1D2B',
    swatchSecondary: '#A8293A',
    role: 'focal',
    imagePath: '/flowers/red-rose.png',
    spriteScale: 0.72,
    heightBias: 0.03,
    radiusWeight: 1.0,
  },
  {
    id: 'blush-rose',
    name: 'Light Pink Rose',
    botanicalNote: 'Soft pastel-pink garden rose',
    priceInr: 120,
    swatchPrimary: '#E3AEB5',
    swatchSecondary: '#F4D4D8',
    role: 'focal',
    imagePath: '/flowers/blush-rose.png',
    spriteScale: 0.72,
    heightBias: 0.02,
    radiusWeight: 1.0,
  },
  {
    id: 'peony',
    name: 'Pink Peony',
    botanicalNote: 'Full, fluffy blush-pink flower',
    priceInr: 280,
    swatchPrimary: '#F2C6CE',
    swatchSecondary: '#FBF0F2',
    role: 'focal',
    imagePath: '/flowers/peony.png',
    spriteScale: 0.84,
    heightBias: 0.05,
    radiusWeight: 1.25,
  },
  {
    id: 'tulip',
    name: 'Pastel Tulip',
    botanicalNote: 'Fresh, upright soft-pink tulip',
    priceInr: 180,
    swatchPrimary: '#EFC3A8',
    swatchSecondary: '#F8DFC9',
    role: 'accent',
    imagePath: '/flowers/tulip.png',
    spriteScale: 0.68,
    heightBias: 0.07,
    radiusWeight: 0.85,
  },
  {
    id: 'lily',
    name: 'White Lily',
    botanicalNote: 'Large, fragrant white star-shaped lily',
    priceInr: 220,
    swatchPrimary: '#FBF9F4',
    swatchSecondary: '#D8A24A',
    role: 'focal',
    imagePath: '/flowers/lily.png',
    spriteScale: 0.86,
    heightBias: 0.08,
    radiusWeight: 1.2,
  },
  {
    id: 'babys-breath',
    name: "Baby's Breath Cloud",
    botanicalNote: 'Delicate clusters of tiny white blooms',
    priceInr: 90,
    swatchPrimary: '#FAF8F3',
    swatchSecondary: '#CFD9CE',
    role: 'filler',
    imagePath: '/flowers/babys-breath.png',
    spriteScale: 0.88,
    heightBias: 0.04,
    radiusWeight: 0.75,
  },
  {
    id: 'eucalyptus',
    name: 'Silver Dollar Eucalyptus',
    botanicalNote: 'Fresh green leaves for a fuller look',
    priceInr: 80,
    swatchPrimary: '#5D7B61',
    swatchSecondary: '#98B29A',
    role: 'foliage',
    imagePath: '/flowers/eucalyptus.png',
    spriteScale: 0.96,
    heightBias: 0.05,
    radiusWeight: 0.9,
  },
];

export const BLOOM_MAP: Record<BloomId, BloomDefinition> = BLOOMS.reduce(
  (acc, bloom) => {
    acc[bloom.id] = bloom;
    return acc;
  },
  {} as Record<BloomId, BloomDefinition>
);

export const WRAP_OPTIONS: WrapOption[] = [
  {
    id: 'light-sage',
    name: 'Light Green Matte Paper',
    subtitle: 'Soft matte green wrapping paper',
    outerColor: '#A7C0A8',
    innerColor: '#EBF1EC',
    roughness: 0.92,
    metalness: 0.0,
    edgeTrimColor: '#EDE0C9',
    photoPath: '/wraps/wrap-sage.png',
  },
  {
    id: 'champagne-cream',
    name: 'Cream Linen Paper',
    subtitle: 'Warm cream paper with gold trim',
    outerColor: '#EDE0C9',
    innerColor: '#FAF7F2',
    roughness: 0.92,
    metalness: 0.0,
    edgeTrimColor: '#C8B288',
    photoPath: '/wraps/wrap-cream.png',
  },
  {
    id: 'deep-forest',
    name: 'Deep Forest Green Paper',
    subtitle: 'Signature dark green matte wrap',
    outerColor: '#17271C',
    innerColor: '#4F6D52',
    roughness: 0.92,
    metalness: 0.0,
    edgeTrimColor: '#C8B288',
    photoPath: '/wraps/wrap-forest.png',
  },
];

export const RIBBON_OPTIONS: RibbonOption[] = [
  {
    id: 'champagne-gold',
    name: 'Champagne Gold Satin',
    subtitle: 'Smooth, glossy gold satin ribbon',
    color: '#C8B288',
    roughness: 0.32,
    metalness: 0.22,
    sheen: 0.9,
    opacity: 1,
    photoPath: '/ribbons/ribbon-gold.png',
  },
  {
    id: 'forest-emerald',
    name: 'Dark Green Silk Ribbon',
    subtitle: 'Rich dark green silk ribbon',
    color: '#17271C',
    roughness: 0.35,
    metalness: 0.14,
    sheen: 0.9,
    opacity: 1,
    photoPath: '/ribbons/ribbon-emerald.png',
  },
  {
    id: 'soft-sage',
    name: 'Light Green Sheer Ribbon',
    subtitle: 'Light, sheer sage green ribbon',
    color: '#A7C0A8',
    roughness: 0.4,
    metalness: 0.08,
    sheen: 0.85,
    opacity: 0.9,
    photoPath: '/ribbons/ribbon-sage.png',
  },
];

export const ADDON_OPTIONS: AddonOption[] = [
  {
    id: 'dark-chocolates',
    name: 'Dark Chocolate Box',
    description: 'Box of 9 rich 70% dark chocolate truffles',
    priceInr: 450,
    accentColor: '#3B251D',
  },
  {
    id: 'soy-candle',
    name: 'Scented Soy Candle',
    description: 'Hand-poured white tea & eucalyptus candle in a glass jar',
    priceInr: 650,
    accentColor: '#4F6D52',
  },
];

export const EMPTY_STEMS: Record<BloomId, number> = {
  'red-rose': 0,
  'blush-rose': 0,
  peony: 0,
  tulip: 0,
  lily: 0,
  'babys-breath': 0,
  eucalyptus: 0,
};

/**
 * Fixed 36-slot rounded florist dome map seated deeply inside the Korean wrap collar.
 * - Slots 0–6 (Ring 1 / Crown): Largest focal blooms nested petal-to-petal (~35–45% overlap, tilt 10°–16°).
 * - Slots 7–18 (Ring 2 / Mid Dome): Medium blooms hugging the inner tissue & front collar (tilt 18°–28°).
 * - Slots 19–26 (Ring 3 / Front-Side Perimeter): Smaller outer blooms framing the collar rim (tilt 28°–36°).
 * - Slots 27–35 (Ring 3 / Behind & Edge Peek-Out): Strictly behind focal blooms for Eucalyptus & Baby's Breath (tilt 28°–40°).
 */
export const SLOTS: BouquetSlot[] = [
  // === RING 1: CROWN (7 focal slots — lush tight bouquet heart, seated deeply inside collar) ===
  { index: 0, ring: 1, zone: 'focal', x: 0.0, y: 0.78, z: 0.2, scale: 1.12, rotation: 0.04, tilt: 10 },
  { index: 1, ring: 1, zone: 'focal', x: -0.25, y: 0.7, z: 0.26, scale: 1.08, rotation: -0.14, tilt: 14 },
  { index: 2, ring: 1, zone: 'focal', x: 0.25, y: 0.71, z: 0.25, scale: 1.08, rotation: 0.15, tilt: 14 },
  { index: 3, ring: 1, zone: 'focal', x: 0.01, y: 0.56, z: 0.34, scale: 1.1, rotation: -0.05, tilt: 16 },
  { index: 4, ring: 1, zone: 'focal', x: -0.22, y: 0.9, z: 0.04, scale: 1.04, rotation: -0.18, tilt: 13 },
  { index: 5, ring: 1, zone: 'focal', x: 0.23, y: 0.89, z: 0.05, scale: 1.04, rotation: 0.18, tilt: 13 },
  { index: 6, ring: 1, zone: 'focal', x: 0.0, y: 0.99, z: -0.05, scale: 1.02, rotation: 0.08, tilt: 12 },

  // === RING 2: MID DOME (12 medium slots encircling the crown & tucking behind front V-fold) ===
  { index: 7, ring: 2, zone: 'focal', x: -0.46, y: 0.64, z: 0.14, scale: 1.0, rotation: -0.22, tilt: 22 },
  { index: 8, ring: 2, zone: 'focal', x: 0.46, y: 0.65, z: 0.14, scale: 1.0, rotation: 0.22, tilt: 22 },
  { index: 9, ring: 2, zone: 'focal', x: -0.27, y: 0.47, z: 0.3, scale: 1.02, rotation: -0.15, tilt: 24 },
  { index: 10, ring: 2, zone: 'focal', x: 0.27, y: 0.48, z: 0.29, scale: 1.02, rotation: 0.16, tilt: 24 },
  { index: 11, ring: 2, zone: 'focal', x: -0.43, y: 0.84, z: -0.04, scale: 0.96, rotation: -0.26, tilt: 21 },
  { index: 12, ring: 2, zone: 'focal', x: 0.43, y: 0.83, z: -0.04, scale: 0.96, rotation: 0.26, tilt: 21 },
  { index: 13, ring: 2, zone: 'focal', x: 0.0, y: 0.4, z: 0.35, scale: 0.98, rotation: 0.04, tilt: 26 },
  { index: 14, ring: 2, zone: 'focal', x: -0.23, y: 1.04, z: -0.12, scale: 0.93, rotation: -0.14, tilt: 19 },
  { index: 15, ring: 2, zone: 'focal', x: 0.23, y: 1.03, z: -0.12, scale: 0.93, rotation: 0.14, tilt: 19 },
  { index: 16, ring: 2, zone: 'focal', x: -0.52, y: 0.5, z: 0.06, scale: 0.94, rotation: -0.3, tilt: 28 },
  { index: 17, ring: 2, zone: 'focal', x: 0.52, y: 0.51, z: 0.06, scale: 0.94, rotation: 0.3, tilt: 28 },
  { index: 18, ring: 2, zone: 'focal', x: 0.0, y: 1.11, z: -0.18, scale: 0.9, rotation: -0.05, tilt: 18 },

  // === RING 3A: OUTER PERIMETER BLOOMS (8 smaller tilted perimeter slots) ===
  { index: 19, ring: 3, zone: 'focal', x: -0.62, y: 0.72, z: -0.06, scale: 0.9, rotation: -0.34, tilt: 32 },
  { index: 20, ring: 3, zone: 'focal', x: 0.62, y: 0.71, z: -0.06, scale: 0.9, rotation: 0.34, tilt: 32 },
  { index: 21, ring: 3, zone: 'focal', x: -0.4, y: 0.39, z: 0.22, scale: 0.92, rotation: -0.2, tilt: 31 },
  { index: 22, ring: 3, zone: 'focal', x: 0.4, y: 0.39, z: 0.21, scale: 0.92, rotation: 0.21, tilt: 31 },
  { index: 23, ring: 3, zone: 'focal', x: -0.52, y: 0.95, z: -0.15, scale: 0.87, rotation: -0.32, tilt: 29 },
  { index: 24, ring: 3, zone: 'focal', x: 0.52, y: 0.94, z: -0.15, scale: 0.87, rotation: 0.32, tilt: 29 },
  { index: 25, ring: 3, zone: 'focal', x: -0.65, y: 0.49, z: -0.05, scale: 0.86, rotation: -0.38, tilt: 36 },
  { index: 26, ring: 3, zone: 'focal', x: 0.65, y: 0.5, z: -0.05, scale: 0.86, rotation: 0.38, tilt: 36 },

  // === RING 3B: BEHIND & EDGE PEEK-OUT SLOTS (9 slots for Eucalyptus & Baby's Breath behind focal blooms) ===
  { index: 27, ring: 3, zone: 'behind', x: -0.7, y: 0.72, z: -0.18, scale: 1.0, rotation: -0.42, tilt: 36 },
  { index: 28, ring: 3, zone: 'behind', x: 0.7, y: 0.71, z: -0.18, scale: 1.0, rotation: 0.42, tilt: 36 },
  { index: 29, ring: 3, zone: 'behind', x: -0.46, y: 1.08, z: -0.22, scale: 0.98, rotation: -0.3, tilt: 30 },
  { index: 30, ring: 3, zone: 'behind', x: 0.46, y: 1.07, z: -0.22, scale: 0.98, rotation: 0.3, tilt: 30 },
  { index: 31, ring: 3, zone: 'behind', x: 0.0, y: 1.18, z: -0.25, scale: 0.96, rotation: 0.05, tilt: 28 },
  { index: 32, ring: 3, zone: 'behind', x: -0.76, y: 0.48, z: -0.14, scale: 0.98, rotation: -0.48, tilt: 40 },
  { index: 33, ring: 3, zone: 'behind', x: 0.76, y: 0.49, z: -0.14, scale: 0.98, rotation: 0.48, tilt: 40 },
  { index: 34, ring: 3, zone: 'behind', x: -0.24, y: 0.82, z: -0.18, scale: 0.94, rotation: -0.18, tilt: 26 },
  { index: 35, ring: 3, zone: 'behind', x: 0.24, y: 0.81, z: -0.18, scale: 0.94, rotation: 0.18, tilt: 26 },
];

export const SIGNATURE_PRESETS: SignaturePreset[] = [
  {
    id: 'forest-champagne',
    name: 'Classic Red & Pink',
    subtitle: 'Best Seller',
    description:
      'Red and pink roses with white lilies and green leaves in our dark green wrap.',
    wrapId: 'deep-forest',
    ribbonId: 'champagne-gold',
    stems: {
      'red-rose': 4,
      'blush-rose': 3,
      peony: 2,
      tulip: 0,
      lily: 2,
      'babys-breath': 3,
      eucalyptus: 4,
    },
    addons: [],
    giftNote: 'Made with love, just for you.',
    palette: ['#17271C', '#7F1D2B', '#FBF9F4', '#C8B288'],
    photoPath: '/bouquets/forest-champagne.jpg',
  },
  {
    id: 'sage-mist-serenity',
    name: 'Fresh Sage & White',
    subtitle: 'Fresh & Calm',
    description:
      "White lilies, soft tulips, and baby's breath with fresh green leaves in light green paper.",
    wrapId: 'light-sage',
    ribbonId: 'forest-emerald',
    stems: {
      'red-rose': 0,
      'blush-rose': 3,
      peony: 2,
      tulip: 4,
      lily: 3,
      'babys-breath': 4,
      eucalyptus: 5,
    },
    addons: [],
    giftNote: 'Wishing you peaceful mornings and happy days.',
    palette: ['#A7C0A8', '#FBF9F4', '#EFC3A8', '#4F6D52'],
    photoPath: '/bouquets/sage-mist-serenity.jpg',
  },
  {
    id: 'blush-atelier',
    name: 'Soft Pink Mix',
    subtitle: 'Soft & Sweet',
    description:
      'Full pink peonies, blush roses, and soft tulips wrapped in cream paper with a light green ribbon.',
    wrapId: 'champagne-cream',
    ribbonId: 'soft-sage',
    stems: {
      'red-rose': 2,
      'blush-rose': 5,
      peony: 4,
      tulip: 3,
      lily: 0,
      'babys-breath': 4,
      eucalyptus: 3,
    },
    addons: [],
    giftNote: 'For special moments worth celebrating.',
    palette: ['#EDE0C9', '#F2C6CE', '#E3AEB5', '#A7C0A8'],
    photoPath: '/bouquets/blush-atelier.jpg',
  },
];

export const DEFAULT_BOUQUET: BouquetConfig = {
  wrapId: SIGNATURE_PRESETS[0].wrapId,
  ribbonId: SIGNATURE_PRESETS[0].ribbonId,
  stems: { ...SIGNATURE_PRESETS[0].stems },
  giftNote: SIGNATURE_PRESETS[0].giftNote,
  addons: [],
  presetName: SIGNATURE_PRESETS[0].name,
};

export interface CameraPresetConfig {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPresetConfig[] = [
  {
    id: 'front',
    label: 'Front View',
    position: [0, 0.85, 5.1],
    target: [0, 0.15, 0],
  },
  {
    id: 'editorial',
    label: 'Side View',
    position: [1.62, 1.32, 4.65],
    target: [0, 0.2, 0],
  },
  {
    id: 'top',
    label: 'Top View',
    position: [0, 1.98, 4.35],
    target: [0, 0.32, 0],
  },
  {
    id: 'tag',
    label: 'Gift Card',
    position: [0.85, -0.62, 2.45],
    target: [0.36, -0.82, 0.45],
  },
];

export const DELIVERY_SLOTS = [
  { id: 'morning', label: 'Morning', window: '9:00 AM – 12:00 PM' },
  { id: 'afternoon', label: 'Afternoon', window: '1:00 PM – 5:00 PM' },
  { id: 'evening', label: 'Evening', window: '6:00 PM – 9:00 PM' },
] as const;

export function getTotalStems(stems: Record<BloomId, number>): number {
  return Object.values(stems).reduce((sum, count) => sum + count, 0);
}

export function getBouquetPricing(config: BouquetConfig): {
  totalStems: number;
  bloomSubtotal: number;
  addonsSubtotal: number;
  grandTotal: number;
} {
  let totalStems = 0;
  let bloomSubtotal = 0;

  for (const bloom of BLOOMS) {
    const qty = config.stems[bloom.id] || 0;
    totalStems += qty;
    bloomSubtotal += qty * bloom.priceInr;
  }

  const addonsSubtotal = config.addons.reduce((sum, addonId) => {
    const found = ADDON_OPTIONS.find((a) => a.id === addonId);
    return sum + (found ? found.priceInr : 0);
  }, 0);

  return {
    totalStems,
    bloomSubtotal,
    addonsSubtotal,
    grandTotal: bloomSubtotal + addonsSubtotal,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getWrapById(id: WrapId): WrapOption {
  return WRAP_OPTIONS.find((w) => w.id === id) ?? WRAP_OPTIONS[0];
}

export function getRibbonById(id: RibbonId): RibbonOption {
  return RIBBON_OPTIONS.find((r) => r.id === id) ?? RIBBON_OPTIONS[0];
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildSingleBouquetWhatsAppMessage(
  config: BouquetConfig,
  options?: { deliveryArea?: string; deliveryDate?: string }
): string {
  const pricing = getBouquetPricing(config);
  const wrap = getWrapById(config.wrapId);
  const ribbon = getRibbonById(config.ribbonId);
  const deliveryFee =
    pricing.grandTotal >= FREE_DELIVERY_THRESHOLD_INR || pricing.grandTotal === 0
      ? 0
      : DELIVERY_FEE_INR;
  const totalWithDelivery = pricing.grandTotal + deliveryFee;

  const lines: string[] = [
    '*FLOWER rchii — Custom Bouquet Order*',
    '_WHERE FLOWER IS BLOOM_',
    '',
    `*Arrangement:* ${config.presetName || 'Bespoke Atelier Bouquet'}`,
    `*Wrapping Paper:* ${wrap.name}`,
    `*Ribbon:* ${ribbon.name}`,
    `*Blooms (${pricing.totalStems} stems):*`,
  ];

  BLOOMS.filter((b) => (config.stems[b.id] || 0) > 0).forEach((b) => {
    const qty = config.stems[b.id];
    lines.push(`  • ${qty} × ${b.name} (${formatINR(qty * b.priceInr)})`);
  });

  if (config.addons.length > 0) {
    const addonNames = config.addons
      .map((id) => {
        const a = ADDON_OPTIONS.find((opt) => opt.id === id);
        return a ? `${a.name} (+${formatINR(a.priceInr)})` : null;
      })
      .filter(Boolean);
    lines.push(`*Add-ons:* ${addonNames.join(', ')}`);
  } else {
    lines.push('*Add-ons:* None');
  }

  lines.push(
    `*Gift Tag Note:* ${config.giftNote.trim() ? `"${config.giftNote.trim()}"` : 'None'}`
  );
  lines.push(`*Delivery Area:* ${options?.deliveryArea?.trim() || 'Indore (to be confirmed)'}`);
  lines.push(`*Delivery Date:* ${options?.deliveryDate || 'To be confirmed'}`);
  lines.push(
    `*Delivery Fee:* ${deliveryFee === 0 ? 'Complimentary' : formatINR(deliveryFee)}`
  );
  lines.push(`*Order Total:* ${formatINR(totalWithDelivery)}`);

  return lines.join('\n');
}

export function buildWhatsAppOrderMessage(params: {
  items: CartBouquetItem[];
  recipientName: string;
  deliveryDate: string;
  deliverySlot: string;
  address: string;
  totalInr: number;
}): string {
  const lines: string[] = [
    '*FLOWER rchii — Custom Bouquet Order*',
    '_WHERE FLOWER IS BLOOM_',
    '',
  ];

  params.items.forEach((item, idx) => {
    const wrap = getWrapById(item.config.wrapId);
    const ribbon = getRibbonById(item.config.ribbonId);
    lines.push(
      `${idx + 1}. *${item.title}* × ${item.quantity} (${formatINR(item.unitPriceInr * item.quantity)})`
    );
    lines.push(`   • Paper: ${wrap.name}`);
    lines.push(`   • Ribbon: ${ribbon.name}`);
    const stemParts = BLOOMS.filter((b) => (item.config.stems[b.id] || 0) > 0).map(
      (b) => `${item.config.stems[b.id]}× ${b.name}`
    );
    lines.push(`   • Blooms (${item.totalStems} stems): ${stemParts.join(', ')}`);
    if (item.config.addons.length > 0) {
      const addonNames = item.config.addons
        .map((id) => ADDON_OPTIONS.find((a) => a.id === id)?.name)
        .filter(Boolean);
      lines.push(`   • Add-ons: ${addonNames.join(', ')}`);
    } else {
      lines.push('   • Add-ons: None');
    }
    lines.push(
      `   • Gift Tag: ${item.config.giftNote.trim() ? `"${item.config.giftNote.trim()}"` : 'None'}`
    );
    lines.push('');
  });

  lines.push(`*Order Total:* ${formatINR(params.totalInr)}`);
  lines.push(`*Recipient:* ${params.recipientName.trim() || 'To be confirmed'}`);
  lines.push(
    `*Delivery Date & Slot:* ${params.deliveryDate ? `${params.deliveryDate} (${params.deliverySlot})` : 'To be confirmed'}`
  );
  lines.push(`*Delivery Area / Address:* ${params.address.trim() || 'Indore (to be confirmed)'}`);
  return lines.join('\n');
}
