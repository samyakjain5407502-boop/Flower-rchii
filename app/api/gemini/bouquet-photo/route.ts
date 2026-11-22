import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel, Type } from '@google/genai';
import {
  BLOOMS,
  EMPTY_STEMS,
  MAX_GIFT_NOTE_LENGTH,
  MAX_TOTAL_STEMS,
  RIBBON_OPTIONS,
  WRAP_OPTIONS,
  getBouquetPricing,
  getRibbonById,
  getWrapById,
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
const BLOOM_IDS: BloomId[] = BLOOMS.map((b) => b.id);

interface BouquetPhotoRequestBody {
  imageBase64?: string;
  mimeType?: string;
  config?: BouquetConfig;
  userQuestion?: string;
}

interface RawPhotoCritiqueOutput {
  harmonyScore?: number;
  visualVerdict?: string;
  floristFeedback?: string;
  suggestedImprovements?: string[];
  enhancedCaption?: string;
  refinedWrapId?: string;
  refinedRibbonId?: string;
  refinedStems?: Partial<Record<BloomId, number>>;
  refinedGiftNote?: string;
}

function sanitizeStems(
  raw: Partial<Record<BloomId, number>> | undefined,
  fallback: Record<BloomId, number>
): Record<BloomId, number> {
  if (!raw) return { ...fallback };
  const cleaned: Record<BloomId, number> = { ...EMPTY_STEMS };
  let total = 0;
  for (const id of BLOOM_IDS) {
    const val = Number(raw[id] ?? 0);
    const clamped = Number.isFinite(val) ? Math.max(0, Math.min(20, Math.round(val))) : 0;
    cleaned[id] = clamped;
    total += clamped;
  }
  if (total === 0) return { ...fallback };
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
    const body = (await req.json()) as BouquetPhotoRequestBody;

    if (!body.imageBase64 || body.imageBase64.length < 32 || !body.config) {
      return NextResponse.json(
        { error: 'Live bouquet photo snapshot and bouquet configuration are required.' },
        { status: 400 }
      );
    }

    const config = body.config;
    const pricing = getBouquetPricing(config);
    const wrap = getWrapById(config.wrapId);
    const ribbon = getRibbonById(config.ribbonId);
    const stemSummary = BLOOMS.filter((b) => (config.stems[b.id] || 0) > 0)
      .map((b) => `${config.stems[b.id]}x ${b.name} (${b.id})`)
      .join(', ');

    const cleanBase64 = body.imageBase64.includes(',')
      ? body.imageBase64.split(',')[1]
      : body.imageBase64;
    const mimeType =
      body.mimeType && body.mimeType.startsWith('image/')
        ? body.mimeType
        : 'image/png';

    const ai = getGeminiClient();

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: GEMINI_FREE_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Inspect this live 3D bouquet studio photo from FLOWER rchii.
Current Recipe:
- Wrap: ${wrap.name} (${wrap.id})
- Ribbon: ${ribbon.name} (${ribbon.id})
- Stems (${pricing.totalStems} total): ${stemSummary || 'None yet'}
- Gift Tag Note: "${config.giftNote || '(empty)'}"
- Price: ₹${pricing.grandTotal}
${body.userQuestion ? `Customer question: "${body.userQuestion}"` : ''}

Available wraps: ${WRAP_OPTIONS.map((w) => w.id).join(', ')}
Available ribbons: ${RIBBON_OPTIONS.map((r) => r.id).join(', ')}
Available blooms: ${BLOOM_IDS.join(', ')}

Provide a genuine visual florist review of this exact bouquet photo: evaluate dome fullness, color contrast against the paper wrap, foliage balance, and propose a polished one-click upgrade keeping total stems balanced and lush (and respecting the customer's color direction). Return strictly valid JSON.`,
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a master luxury floral director and botanical photographer at FLOWER rchii. Give honest, encouraging, visually grounded feedback based on the bouquet photo you see. Keep tone refined, practical, and concise.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              harmonyScore: {
                type: Type.INTEGER,
                description: 'Visual harmony and fullness score from 65 to 99.',
              },
              visualVerdict: {
                type: Type.STRING,
                description: 'Short 4-7 word studio headline for this bouquet photo.',
              },
              floristFeedback: {
                type: Type.STRING,
                description:
                  '2-3 sentences evaluating color harmony, wrap contrast, dome silhouette, and visual impact.',
              },
              suggestedImprovements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 brief, actionable tweaks to make the bouquet photo look even more luxurious.',
              },
              enhancedCaption: {
                type: Type.STRING,
                description:
                  'An elegant 1-sentence caption ready to share alongside the bouquet photo on WhatsApp or Instagram.',
              },
              refinedWrapId: { type: Type.STRING },
              refinedRibbonId: { type: Type.STRING },
              refinedStems: {
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
              refinedGiftNote: { type: Type.STRING },
            },
            required: [
              'harmonyScore',
              'visualVerdict',
              'floristFeedback',
              'suggestedImprovements',
              'enhancedCaption',
              'refinedWrapId',
              'refinedRibbonId',
              'refinedStems',
              'refinedGiftNote',
            ],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return NextResponse.json(
        { error: 'AI Photo Studio returned an empty review. Please try again.' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawText) as RawPhotoCritiqueOutput;

    const refinedWrapId: WrapId =
      parsed.refinedWrapId && VALID_WRAPS.has(parsed.refinedWrapId as WrapId)
        ? (parsed.refinedWrapId as WrapId)
        : config.wrapId;
    const refinedRibbonId: RibbonId =
      parsed.refinedRibbonId && VALID_RIBBONS.has(parsed.refinedRibbonId as RibbonId)
        ? (parsed.refinedRibbonId as RibbonId)
        : config.ribbonId;
    const refinedStems = sanitizeStems(parsed.refinedStems, config.stems);
    const refinedGiftNote = (parsed.refinedGiftNote || config.giftNote || '')
      .trim()
      .slice(0, MAX_GIFT_NOTE_LENGTH);

    return NextResponse.json({
      harmonyScore: Math.max(
        60,
        Math.min(99, Math.round(Number(parsed.harmonyScore) || 88))
      ),
      visualVerdict: (parsed.visualVerdict || 'Refined Botanical Silhouette').trim(),
      floristFeedback: (parsed.floristFeedback || '').trim(),
      suggestedImprovements: Array.isArray(parsed.suggestedImprovements)
        ? parsed.suggestedImprovements.slice(0, 3)
        : [],
      enhancedCaption: (parsed.enhancedCaption || '').trim(),
      refinedConfig: {
        ...config,
        wrapId: refinedWrapId,
        ribbonId: refinedRibbonId,
        stems: refinedStems,
        giftNote: refinedGiftNote,
        presetName: config.presetName ? `${config.presetName} (AI Polished)` : 'AI Polished Bouquet',
      } satisfies BouquetConfig,
    });
  } catch (error: unknown) {
    const formatted = formatGeminiErrorResponse(error);
    return NextResponse.json({ error: formatted.message }, { status: formatted.status });
  }
}
