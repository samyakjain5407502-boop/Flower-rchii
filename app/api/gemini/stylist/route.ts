import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ADDON_OPTIONS,
  BLOOM_MAP,
  BLOOMS,
  EMPTY_STEMS,
  MAX_TOTAL_STEMS,
  RIBBON_OPTIONS,
  WRAP_OPTIONS,
  getBouquetPricing,
  getTotalStems,
  type AddonId,
  type BloomId,
  type BouquetConfig,
  type RibbonId,
  type WrapId,
} from '@/lib/bouquet-data';
import {
  GEMINI_FREE_MODEL,
  formatGeminiErrorResponse,
  getGeminiClient,
  withGeminiRetry,
} from '@/lib/gemini';

const VALID_WRAPS = new Set<WrapId>(WRAP_OPTIONS.map((w) => w.id));
const VALID_RIBBONS = new Set<RibbonId>(RIBBON_OPTIONS.map((r) => r.id));
const VALID_ADDONS = new Set<AddonId>(ADDON_OPTIONS.map((a) => a.id));
const BLOOM_IDS: BloomId[] = BLOOMS.map((b) => b.id);
const MAX_STYLIST_NOTE_CHARS = 98;

export type RefineAction = 'fuller' | 'under-1500' | 'pastel-pink';

interface StylistRequestBody {
  prompt?: string;
  occasion?: string;
  colorVibe?: string;
  budgetInr?: number | null;
  referenceImageBase64?: string;
  referenceMimeType?: string;
  currentConfig?: BouquetConfig;
  previousSuggestion?: BouquetConfig;
  refineAction?: RefineAction;
}

interface RawAiStylistOutput {
  bouquetTitle?: string;
  stylistNote?: string;
  wrapId?: string;
  ribbonId?: string;
  stems?: Partial<Record<BloomId, number>>;
  addons?: string[];
  giftNote?: string;
  photoStylingTip?: string;
}

interface ParsedIntent {
  explicitBlooms: BloomId[];
  onlyExplicitBlooms: boolean;
  paletteTheme: 'red-romantic' | 'pastel-pink' | 'white-minimal' | null;
  effectiveBudgetInr: number | null;
}

const CATALOG_SUMMARY = `
FLOWER rchii Catalog (Indore, India — exact INR prices):
Flowers (max ${MAX_TOTAL_STEMS} total stems):
${BLOOMS.map((b) => `- "${b.id}": ${b.name} (₹${b.priceInr}/stem) — ${b.botanicalNote}`).join('\n')}

Wrapping Paper (included, ₹0):
${WRAP_OPTIONS.map((w) => `- "${w.id}": ${w.name} (${w.subtitle})`).join('\n')}

Ribbons (included, ₹0):
${RIBBON_OPTIONS.map((r) => `- "${r.id}": ${r.name} (${r.subtitle})`).join('\n')}

Optional Extras:
${ADDON_OPTIONS.map((a) => `- "${a.id}": ${a.name} (+₹${a.priceInr}) — ${a.description}`).join('\n')}
`.trim();

/** Parse free-text prompt + chips with free-text taking top priority */
function parseUserIntent(body: StylistRequestBody): ParsedIntent {
  const rawPrompt = (body.prompt || '').toLowerCase();
  const occasion = (body.occasion || '').toLowerCase();
  const colorVibe = (body.colorVibe || '').toLowerCase();
  const combined = `${rawPrompt} ${colorVibe} ${occasion}`;

  // 1. Detect explicit flower requests from free text first
  const explicitBlooms: BloomId[] = [];
  const addBloom = (id: BloomId) => {
    if (!explicitBlooms.includes(id)) explicitBlooms.push(id);
  };

  if (/\bred\s+rose/.test(rawPrompt) || /\bvelvet\s+rose/.test(rawPrompt)) {
    addBloom('red-rose');
  }
  if (
    /\bblush\s+(pink\s+)?rose/.test(rawPrompt) ||
    /\bpink\s+rose/.test(rawPrompt)
  ) {
    addBloom('blush-rose');
  }
  // Generic "roses" without red/pink qualifier -> pick based on vibe or red-rose default
  if (
    /\brose(s)?\b/.test(rawPrompt) &&
    !explicitBlooms.includes('red-rose') &&
    !explicitBlooms.includes('blush-rose')
  ) {
    if (/pink|pastel|cute|mom|mother|sister/.test(combined)) {
      addBloom('blush-rose');
    } else {
      addBloom('red-rose');
    }
  }
  if (/\bpeon(y|ies)\b/.test(rawPrompt)) addBloom('peony');
  if (/\btulip(s)?\b/.test(rawPrompt)) addBloom('tulip');
  if (/\blil(y|ies)\b/.test(rawPrompt)) addBloom('lily');
  if (/\bbaby'?s?\s*breath\b|\bgypsophila\b/.test(rawPrompt)) {
    addBloom('babys-breath');
  }
  if (/\beucalyptus\b|\bgreenery\b|\bleaves\b/.test(rawPrompt)) {
    addBloom('eucalyptus');
  }

  const onlyExplicitBlooms =
    explicitBlooms.length > 0 &&
    /\b(only|just|purely|sirf|bas)\b/.test(rawPrompt);

  // 2. Color & Occasion Mapping (free text overrides chips; refineAction overrides both)
  let paletteTheme: ParsedIntent['paletteTheme'] = null;
  if (body.refineAction === 'pastel-pink') {
    paletteTheme = 'pastel-pink';
  } else {
    const checkTheme = (text: string): ParsedIntent['paletteTheme'] => {
      if (/\b(white|elegant|sorry|apology|peace|minimal|calm|clean)\b/.test(text)) {
        return 'white-minimal';
      }
      if (
        /\b(pastel|pink|cute|birthday|mother|mom|sister|blush|soft)\b/.test(text)
      ) {
        return 'pastel-pink';
      }
      if (
        /\b(red|romantic|love|anniversary|proposal|valentine|date|romance)\b/.test(
          text
        )
      ) {
        return 'red-romantic';
      }
      return null;
    };

    paletteTheme =
      checkTheme(rawPrompt) ?? checkTheme(colorVibe) ?? checkTheme(occasion);
  }

  // 3. Budget Detection (refineAction 'under-1500' -> 1500, else free-text ₹ amount, else budget chip)
  let effectiveBudgetInr: number | null =
    typeof body.budgetInr === 'number' &&
    Number.isFinite(body.budgetInr) &&
    body.budgetInr > 0
      ? Math.round(body.budgetInr)
      : null;

  if (body.refineAction === 'under-1500') {
    effectiveBudgetInr = 1500;
  } else {
    const budgetMatch =
      rawPrompt.match(/(?:₹|rs\.?|inr|under|below|max|budget(?:\s+of)?)\s*(\d{3,5})/i) ||
      rawPrompt.match(/(\d{3,5})\s*(?:₹|rs\.?|inr|rupees|ke\s+andar|tak)/i);
    if (budgetMatch) {
      const parsedBudget = Number(budgetMatch[1]);
      if (Number.isFinite(parsedBudget) && parsedBudget >= 400 && parsedBudget <= 25000) {
        effectiveBudgetInr = Math.round(parsedBudget);
      }
    }
  }

  return {
    explicitBlooms,
    onlyExplicitBlooms,
    paletteTheme,
    effectiveBudgetInr,
  };
}

function clampTotalStems(stems: Record<BloomId, number>): Record<BloomId, number> {
  const next = { ...stems };
  for (const id of BLOOM_IDS) {
    const val = Number(next[id] ?? 0);
    next[id] = Number.isFinite(val)
      ? Math.max(0, Math.min(24, Math.round(val)))
      : 0;
  }

  let total = getTotalStems(next);
  while (total > MAX_TOTAL_STEMS) {
    const maxId = BLOOM_IDS.reduce((best, id) =>
      next[id] > next[best] ? id : best
    );
    if (next[maxId] <= 0) break;
    next[maxId] -= 1;
    total -= 1;
  }
  return next;
}

/**
 * Enforces exact flower matching, palette wrap/ribbon rules, refineAction (+3 stems / pastel),
 * and strict INR budget cap math so the bouquet NEVER exceeds the requested budget.
 */
function enforceStylistConstraints(
  candidate: BouquetConfig,
  intent: ParsedIntent,
  body: StylistRequestBody
): BouquetConfig {
  let wrapId = candidate.wrapId;
  let ribbonId = candidate.ribbonId;
  let stems = clampTotalStems(candidate.stems);
  let addons = [...candidate.addons];

  // Apply explicit pastel-pink refinement deterministically
  if (body.refineAction === 'pastel-pink') {
    stems = {
      ...EMPTY_STEMS,
      'blush-rose': Math.max(4, (stems['red-rose'] || 0) + (stems['blush-rose'] || 0)),
      peony: Math.max(2, stems.peony || 2),
      tulip: Math.max(2, stems.tulip || 2),
      'babys-breath': Math.max(2, stems['babys-breath'] || 2),
      eucalyptus: Math.max(2, stems.eucalyptus || 2),
    };
    wrapId = 'light-sage';
    ribbonId = 'soft-sage';
  }

  // Apply "+3 stems" fuller refinement directly onto previous suggestion if available
  if (body.refineAction === 'fuller' && body.previousSuggestion) {
    stems = clampTotalStems(body.previousSuggestion.stems);
    wrapId = body.previousSuggestion.wrapId;
    ribbonId = body.previousSuggestion.ribbonId;
    addons = [...body.previousSuggestion.addons];

    const activeBlooms = BLOOM_IDS.filter((id) => stems[id] > 0);
    const boostOrder: BloomId[] =
      activeBlooms.length > 0
        ? activeBlooms
        : ['blush-rose', 'peony', 'babys-breath'];
    for (let i = 0; i < 3 && getTotalStems(stems) < MAX_TOTAL_STEMS; i++) {
      const target = boostOrder[i % boostOrder.length];
      stems[target] += 1;
    }
  }

  // Strict explicit flower matching from free text
  if (intent.explicitBlooms.length > 0 && body.refineAction !== 'pastel-pink') {
    if (intent.onlyExplicitBlooms) {
      for (const id of BLOOM_IDS) {
        if (!intent.explicitBlooms.includes(id)) {
          stems[id] = 0;
        }
      }
    }
    for (const id of intent.explicitBlooms) {
      if (stems[id] <= 0) {
        stems[id] = intent.onlyExplicitBlooms ? 8 : 4;
      }
    }
  }

  // Palette theme wrap/ribbon & flower alignment (when not overridden by "only X")
  if (!intent.onlyExplicitBlooms && intent.paletteTheme) {
    if (intent.paletteTheme === 'red-romantic') {
      if (wrapId !== 'deep-forest' && wrapId !== 'champagne-cream') {
        wrapId = 'deep-forest';
      }
      ribbonId = 'champagne-gold';
      if (stems['red-rose'] === 0 && intent.explicitBlooms.length === 0) {
        stems['red-rose'] = 6;
      }
      if (stems['babys-breath'] === 0 && intent.explicitBlooms.length === 0) {
        stems['babys-breath'] = 3;
      }
    } else if (intent.paletteTheme === 'pastel-pink') {
      wrapId = 'light-sage';
      ribbonId = 'soft-sage';
      if (intent.explicitBlooms.length === 0) {
        stems['red-rose'] = 0;
        if (stems['blush-rose'] === 0) stems['blush-rose'] = 4;
        if (stems.peony === 0) stems.peony = 2;
        if (stems.tulip === 0) stems.tulip = 2;
      }
    } else if (intent.paletteTheme === 'white-minimal') {
      wrapId = 'light-sage';
      if (intent.explicitBlooms.length === 0) {
        stems['red-rose'] = 0;
        if (stems.lily === 0) stems.lily = 3;
        if (stems['babys-breath'] === 0) stems['babys-breath'] = 4;
        if (stems.eucalyptus === 0) stems.eucalyptus = 4;
      }
    }
  }

  // Ensure non-empty bouquet
  if (getTotalStems(stems) === 0) {
    stems['blush-rose'] = 5;
    stems['babys-breath'] = 3;
    stems.eucalyptus = 3;
  }

  stems = clampTotalStems(stems);

  // Strict INR Budget Cap Math (NEVER exceed effectiveBudgetInr)
  const budgetCap = intent.effectiveBudgetInr;
  if (budgetCap !== null && body.refineAction !== 'fuller') {
    const calcTotal = () =>
      getBouquetPricing({
        wrapId,
        ribbonId,
        stems,
        addons,
        giftNote: candidate.giftNote,
      }).grandTotal;

    // 1. Remove optional add-ons first if over budget
    while (addons.length > 0 && calcTotal() > budgetCap) {
      addons.pop();
    }

    // 2. Trim stems until total <= budgetCap (protect explicit blooms as long as possible)
    let safety = 0;
    while (calcTotal() > budgetCap && getTotalStems(stems) > 1 && safety < 100) {
      safety += 1;
      const nonExplicit = BLOOM_IDS.filter(
        (id) => stems[id] > 0 && !intent.explicitBlooms.includes(id)
      );
      const pool =
        nonExplicit.length > 0
          ? nonExplicit
          : BLOOM_IDS.filter((id) => stems[id] > 0);
      if (pool.length === 0) break;

      // Prefer trimming the most expensive stem first, or highest count on tie
      pool.sort((a, b) => {
        const diff = BLOOM_MAP[b].priceInr - BLOOM_MAP[a].priceInr;
        return diff !== 0 ? diff : stems[b] - stems[a];
      });
      const target = pool[0];
      stems[target] -= 1;
    }

    // 3. Top up gently if well below budget so customer gets great value at/just below cap
    const topUpPool: BloomId[] =
      intent.explicitBlooms.length > 0
        ? intent.explicitBlooms
        : intent.paletteTheme === 'red-romantic'
          ? ['red-rose', 'babys-breath', 'eucalyptus']
          : intent.paletteTheme === 'pastel-pink'
            ? ['blush-rose', 'tulip', 'peony', 'babys-breath']
            : intent.paletteTheme === 'white-minimal'
              ? ['lily', 'babys-breath', 'eucalyptus']
              : BLOOM_IDS.filter((id) => stems[id] > 0);

   const safePool: BloomId[] = topUpPool.length > 0 ? topUpPool : ['blush-rose', 'babys-breath'];
    let addSafety = 0;
    while (getTotalStems(stems) < MAX_TOTAL_STEMS && addSafety < 25) {
      addSafety += 1;
      const currentTotal = calcTotal();
      const remaining = budgetCap - currentTotal;
      if (remaining < 80) break;

      // Pick a flower from the theme pool that fits within remaining budget
      const fitting = safePool
        .filter((id) => BLOOM_MAP[id].priceInr <= remaining)
        .sort((a, b) => stems[a] - stems[b]);

      if (fitting.length === 0) break;
      stems[fitting[0]] += 1;
    }
  }

  return {
    wrapId,
    ribbonId,
    stems,
    addons,
    giftNote: (candidate.giftNote || 'Fresh flowers picked with love.')
      .trim()
      .slice(0, MAX_STYLIST_NOTE_CHARS),
    presetName: candidate.presetName,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StylistRequestBody;
    const prompt = (body.prompt || '').trim();
    const occasion = (body.occasion || '').trim();
    const colorVibe = (body.colorVibe || '').trim();
    const hasImage =
      typeof body.referenceImageBase64 === 'string' &&
      body.referenceImageBase64.length > 32;

    if (!prompt && !occasion && !colorVibe && !hasImage && !body.refineAction) {
      return NextResponse.json(
        {
          error:
            'Please pick an occasion, choose a color style, write what you want, or upload a photo.',
        },
        { status: 400 }
      );
    }

    const intent = parseUserIntent(body);
    const ai = getGeminiClient();

    const refineInstructions =
      body.refineAction === 'fuller'
        ? 'REFINE REQUEST: Make the previous bouquet fuller by adding +3 stems while keeping the same color vibe.'
        : body.refineAction === 'under-1500'
          ? 'REFINE REQUEST: Keep the total bouquet price strictly at or under ₹1,500 INR while keeping the same vibe.'
          : body.refineAction === 'pastel-pink'
            ? 'REFINE REQUEST: Switch this bouquet to a soft pastel pink look (Blush Pink Roses, Dutch Peonies, Pastel Tulips, Light Sage paper, Soft Sage ribbon).'
            : null;

    const userBriefLines = [
      prompt ? `FREE-TEXT REQUEST (TOP PRIORITY): "${prompt}"` : null,
      occasion ? `Selected Occasion: ${occasion}` : null,
      colorVibe ? `Selected Color / Vibe: ${colorVibe}` : null,
      intent.effectiveBudgetInr
        ? `STRICT BUDGET CAP: ₹${intent.effectiveBudgetInr} INR — total cost of stems + add-ons MUST be at or below ₹${intent.effectiveBudgetInr}.`
        : 'Budget: Flexible (aim for 12–20 balanced stems).',
      intent.explicitBlooms.length > 0
        ? `PRIORITY FLOWERS REQUESTED: ${intent.explicitBlooms.join(', ')}${
            intent.onlyExplicitBlooms
              ? ' (ONLY use these flowers; set all other flowers to 0!)'
              : ''
          }`
        : null,
      refineInstructions,
      hasImage
        ? 'The customer uploaded an inspiration photo. Match its colors, flower feel, and wrapping style using only the FLOWER rchii catalog.'
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (hasImage && body.referenceImageBase64) {
      const mimeType =
        body.referenceMimeType && body.referenceMimeType.startsWith('image/')
          ? body.referenceMimeType
          : 'image/jpeg';
      const cleanBase64 = body.referenceImageBase64.includes(',')
        ? body.referenceImageBase64.split(',')[1]
        : body.referenceImageBase64;
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `${CATALOG_SUMMARY}

MAPPING RULES:
- Red / Romantic / Love / Anniversary -> red-rose + babys-breath + deep-forest or champagne-cream wrap + champagne-gold ribbon.
- Pastel / Pink / Cute / Birthday / Mother / Sister -> blush-rose + peony + tulip + light-sage wrap + soft-sage ribbon.
- White / Elegant / Sorry / Peace / Minimal -> lily + babys-breath + eucalyptus + light-sage wrap.
- If the customer asks for specific flowers in their text, ALWAYS prioritize those exact flowers.

CUSTOMER BRIEF:
${userBriefLines}

Return valid JSON matching the schema. Keep stylistNote to 2 short, friendly sentences in simple everyday English. Keep giftNote occasion-matched and strictly under 95 characters.`,
    });

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: GEMINI_FREE_MODEL,
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a friendly flower shop stylist at FLOWER rchii in Indore. Write in warm, simple, everyday English that anyone can understand at a glance. Avoid fancy or poetic jargon. Follow the customer’s exact flower requests and strict INR budget cap.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bouquetTitle: {
                type: Type.STRING,
                description: 'Simple, warm 2-4 word bouquet name.',
              },
              stylistNote: {
                type: Type.STRING,
                description:
                  '2 short, friendly sentences in everyday English explaining why these flowers and wrap fit the request.',
              },
              wrapId: {
                type: Type.STRING,
                description: `One of: ${WRAP_OPTIONS.map((w) => w.id).join(', ')}.`,
              },
              ribbonId: {
                type: Type.STRING,
                description: `One of: ${RIBBON_OPTIONS.map((r) => r.id).join(', ')}.`,
              },
              stems: {
                type: Type.OBJECT,
                properties: {
                  'red-rose': { type: Type.INTEGER },
                  'blush-rose': { type: Type.INTEGER },
                  peony: { type: Type.INTEGER },
                  tulip: { type: Type.INTEGER },
                  lily: { type: Type.INTEGER },
                  'babys-breath': { type: Type.INTEGER },
                  eucalyptus: { type: Type.INTEGER },
                },
                required: [
                  'red-rose',
                  'blush-rose',
                  'peony',
                  'tulip',
                  'lily',
                  'babys-breath',
                  'eucalyptus',
                ],
              },
              addons: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: `Zero or more of: ${ADDON_OPTIONS.map((a) => a.id).join(', ')}.`,
              },
              giftNote: {
                type: Type.STRING,
                description:
                  'Warm, occasion-matched card message strictly under 95 characters.',
              },
              photoStylingTip: {
                type: Type.STRING,
                description:
                  'One short, practical tip for taking a nice photo of this bouquet.',
              },
            },
            required: [
              'bouquetTitle',
              'stylistNote',
              'wrapId',
              'ribbonId',
              'stems',
              'addons',
              'giftNote',
              'photoStylingTip',
            ],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return NextResponse.json(
        { error: 'The stylist returned an empty reply. Please try again.' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawText) as RawAiStylistOutput;

    const wrapId: WrapId =
      parsed.wrapId && VALID_WRAPS.has(parsed.wrapId as WrapId)
        ? (parsed.wrapId as WrapId)
        : WRAP_OPTIONS[1].id;
    const ribbonId: RibbonId =
      parsed.ribbonId && VALID_RIBBONS.has(parsed.ribbonId as RibbonId)
        ? (parsed.ribbonId as RibbonId)
        : RIBBON_OPTIONS[0].id;

    const rawStems: Record<BloomId, number> = { ...EMPTY_STEMS };
    for (const id of BLOOM_IDS) {
      rawStems[id] = Number(parsed.stems?.[id] ?? 0);
    }

    const addons: AddonId[] = Array.isArray(parsed.addons)
      ? Array.from(
          new Set(
            parsed.addons.filter((id): id is AddonId =>
              VALID_ADDONS.has(id as AddonId)
            )
          )
        )
      : [];

    const bouquetTitle = (parsed.bouquetTitle || 'Custom Flower Bouquet').trim();

    const finalConfig = enforceStylistConstraints(
      {
        wrapId,
        ribbonId,
        stems: rawStems,
        addons,
        giftNote: (parsed.giftNote || 'Fresh flowers picked just for you.').trim(),
        presetName: bouquetTitle,
      },
      intent,
      body
    );

    return NextResponse.json({
      bouquetTitle,
      stylistNote: (parsed.stylistNote || '').trim(),
      photoStylingTip: (parsed.photoStylingTip || '').trim(),
      config: finalConfig,
    });
  } catch (error: unknown) {
    const formatted = formatGeminiErrorResponse(error);
    return NextResponse.json(
      { error: formatted.message },
      { status: formatted.status }
    );
  }
}
