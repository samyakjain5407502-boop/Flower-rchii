import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ADDON_OPTIONS,
  BLOOMS,
  EMPTY_STEMS,
  MAX_GIFT_NOTE_LENGTH,
  MAX_TOTAL_STEMS,
  RIBBON_OPTIONS,
  WRAP_OPTIONS,
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

interface StylistRequestBody {
  prompt?: string;
  occasion?: string;
  budgetInr?: number | null;
  referenceImageBase64?: string;
  referenceMimeType?: string;
  currentConfig?: BouquetConfig;
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

const CATALOG_SUMMARY = `
FLOWER rchii Catalog (Indore Luxury Floral Atelier, INR pricing):
Blooms (max 36 total stems):
${BLOOMS.map((b) => `- "${b.id}": ${b.name} (₹${b.priceInr}/stem) — ${b.botanicalNote}`).join('\n')}

Wrapping Papers (included):
${WRAP_OPTIONS.map((w) => `- "${w.id}": ${w.name} (${w.subtitle})`).join('\n')}

Ribbons (included):
${RIBBON_OPTIONS.map((r) => `- "${r.id}": ${r.name} (${r.subtitle})`).join('\n')}

Optional Luxury Add-ons:
${ADDON_OPTIONS.map((a) => `- "${a.id}": ${a.name} (+₹${a.priceInr}) — ${a.description}`).join('\n')}
`.trim();

function sanitizeStems(raw?: Partial<Record<BloomId, number>>): Record<BloomId, number> {
  const cleaned: Record<BloomId, number> = { ...EMPTY_STEMS };
  let total = 0;

  for (const id of BLOOM_IDS) {
    const val = Number(raw?.[id] ?? 0);
    const clamped = Number.isFinite(val) ? Math.max(0, Math.min(20, Math.round(val))) : 0;
    cleaned[id] = clamped;
    total += clamped;
  }

  // Ensure at least a lush miniature arrangement if AI returned all zeros
  if (total === 0) {
    cleaned['blush-rose'] = 5;
    cleaned['peony'] = 3;
    cleaned['babys-breath'] = 3;
    cleaned['eucalyptus'] = 3;
    return cleaned;
  }

  // Proportionally scale down if total exceeds MAX_TOTAL_STEMS (36)
  if (total > MAX_TOTAL_STEMS) {
    const ratio = MAX_TOTAL_STEMS / total;
    let running = 0;
    for (const id of BLOOM_IDS) {
      const scaled = cleaned[id] > 0 ? Math.max(1, Math.floor(cleaned[id] * ratio)) : 0;
      cleaned[id] = scaled;
      running += scaled;
    }
    while (running > MAX_TOTAL_STEMS) {
      const maxId = BLOOM_IDS.reduce((best, id) =>
        cleaned[id] > cleaned[best] ? id : best
      );
      if (cleaned[maxId] <= 0) break;
      cleaned[maxId] -= 1;
      running -= 1;
    }
  }

  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StylistRequestBody;
    const prompt = (body.prompt || '').trim();
    const occasion = (body.occasion || '').trim();
    const budgetInr =
      typeof body.budgetInr === 'number' && Number.isFinite(body.budgetInr) && body.budgetInr > 0
        ? Math.round(body.budgetInr)
        : null;
    const hasImage =
      typeof body.referenceImageBase64 === 'string' &&
      body.referenceImageBase64.length > 32;

    if (!prompt && !occasion && !hasImage) {
      return NextResponse.json(
        { error: 'Please enter an occasion, mood, or upload a reference photo.' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const userBriefLines = [
      occasion ? `Occasion: ${occasion}` : null,
      budgetInr ? `Target budget: around ₹${budgetInr} INR (stay close to or slightly under this total including any add-ons)` : 'Target budget: flexible luxury bouquet (typically 12–22 stems)',
      prompt ? `Customer request: "${prompt}"` : null,
      hasImage
        ? 'The customer uploaded a reference photo (bouquet inspiration, color palette, or outfit vibe). Closely match its colors, mood, flower density, and wrapping style using only the FLOWER rchii catalog.'
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
      // Strip optional data URI prefix if sent
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
      text: `${CATALOG_SUMMARY}\n\nCustomer Brief:\n${userBriefLines}\n\nDesign a cohesive, lush FLOWER rchii bouquet that looks full and realistic in a 3D dome (combine focal blooms with 2-5 stems of babys-breath and/or eucalyptus filler for lush volume). Return strictly valid JSON matching the schema.`,
    });

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: GEMINI_FREE_MODEL,
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are the Head Floral Stylist at FLOWER rchii ("WHERE FLOWER IS BLOOM"), a boutique luxury floral atelier in Indore, India. You understand English, Hindi, and Hinglish seamlessly. Always reply in warm, refined English (with tasteful Hindi warmth only if the customer wrote in Hindi/Hinglish). Use ONLY the exact catalog IDs provided. Keep giftNote poetic and under 110 characters.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bouquetTitle: {
                type: Type.STRING,
                description: 'Poetic 2-4 word luxury bouquet title.',
              },
              stylistNote: {
                type: Type.STRING,
                description:
                  '2 concise, warm sentences explaining why these blooms, wrap, and ribbon fit the request or reference photo.',
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
                  'Heartfelt gift tag message under 110 characters for the oval cardstock tag.',
              },
              photoStylingTip: {
                type: Type.STRING,
                description:
                  'One practical tip on camera angle, lighting, or gifting presentation so the bouquet photographs beautifully.',
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
        { error: 'AI Florist returned an empty response. Please try again.' },
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
    const stems = sanitizeStems(parsed.stems);
    const addons: AddonId[] = Array.isArray(parsed.addons)
      ? Array.from(
          new Set(
            parsed.addons.filter((id): id is AddonId =>
              VALID_ADDONS.has(id as AddonId)
            )
          )
        )
      : [];
    const giftNote = (parsed.giftNote || 'Hand-arranged with love from FLOWER rchii.')
      .trim()
      .slice(0, MAX_GIFT_NOTE_LENGTH);

    return NextResponse.json({
      bouquetTitle: (parsed.bouquetTitle || 'Bespoke Atelier Creation').trim(),
      stylistNote: (parsed.stylistNote || '').trim(),
      photoStylingTip: (parsed.photoStylingTip || '').trim(),
      config: {
        wrapId,
        ribbonId,
        stems,
        addons,
        giftNote,
        presetName: (parsed.bouquetTitle || 'AI Atelier Creation').trim(),
      } satisfies BouquetConfig,
    });
  } catch (error: unknown) {
    const formatted = formatGeminiErrorResponse(error);
    return NextResponse.json({ error: formatted.message }, { status: formatted.status });
  }
}
