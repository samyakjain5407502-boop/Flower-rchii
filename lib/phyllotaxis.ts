import { BLOOM_MAP, SLOTS, type BloomId, type BouquetSlot } from './bouquet-data';

export interface StemPlacement {
  key: string;
  bloomId: BloomId;
  slotIndex: number;
  ring: 1 | 2 | 3;
  zone: 'focal' | 'behind';
  seed: number;
  headPosition: [number, number, number];
  /** Single waist tie convergence point beneath the wrap collar */
  stemTiePoint: [number, number, number];
  /** Stem bottom exit beneath the wrapped skirt */
  stemBottom: [number, number, number];
  /** Legacy alias kept for compatibility */
  stemBase: [number, number, number];
  tiltRad: number;
  tiltX: number;
  tiltZ: number;
  rotation: number;
  yaw: number;
  scale: number;
  /** 0 = front-most bright bloom, 1 = back-most shaded bloom (used for 12–15% back-row darkening) */
  depthFactor: number;
  /** Deterministic back-to-front renderOrder to prevent WebGL transparency sorting artifacts */
  renderOrder: number;
}

/**
 * Deterministic pseudo-random helper in [0, 1) so arrangements are 100% stable between re-renders.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Deterministic shuffle of flower-to-slot assignment while keeping fixed slot coordinates untouched.
 */
function rotateAndMix<T>(items: T[], shuffleSeed: number): T[] {
  if (shuffleSeed === 0 || items.length <= 1) return items;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const r = seededRandom(shuffleSeed * 37.3 + i * 19.1);
    const j = Math.floor(r * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Maps selected stems onto the fixed 36-entry SLOTS dome config:
 * - Fills focal & accent blooms from the center crown outward, alternating flower types for natural colour blending.
 * - Places Eucalyptus and Baby's Breath strictly BEHIND focal blooms & on edge peek-out slots.
 * - "Shuffle" (shuffleSeed) only reassigns flowers across slots; slot positions remain fixed.
 * - Computes depthFactor (0 front → 1 back) and back-to-front renderOrder for zero sorting artifacts.
 */
export function computePhyllotaxisLayout(
  stems: Record<BloomId, number>,
  shuffleSeed = 0
): StemPlacement[] {
  const focalOrder: BloomId[] = ['peony', 'red-rose', 'blush-rose', 'lily', 'tulip'];
  const shiftedFocalOrder =
    shuffleSeed === 0
      ? focalOrder
      : focalOrder.map((_, idx) => focalOrder[(idx + shuffleSeed) % focalOrder.length]);

  // Alternate flower types round-robin so mixed bouquets blend naturally across the dome
  const focalQueue: { bloomId: BloomId; ordinal: number }[] = [];
  const maxFocalCount = Math.max(...shiftedFocalOrder.map((id) => stems[id] || 0));
  for (let round = 0; round < maxFocalCount; round++) {
    for (const id of shiftedFocalOrder) {
      if (round < (stems[id] || 0)) {
        focalQueue.push({ bloomId: id, ordinal: round });
      }
    }
  }

  // Interleave Eucalyptus & Baby's Breath for balanced greenery/cloud halo behind focal blooms
  const behindQueue: { bloomId: BloomId; ordinal: number }[] = [];
  const eucCount = stems.eucalyptus || 0;
  const bbCount = stems['babys-breath'] || 0;
  const maxBehind = Math.max(eucCount, bbCount);
  for (let i = 0; i < maxBehind; i++) {
    if (i < eucCount) behindQueue.push({ bloomId: 'eucalyptus', ordinal: i });
    if (i < bbCount) behindQueue.push({ bloomId: 'babys-breath', ordinal: i });
  }

  // Apply deterministic shuffle to flower-to-slot assignment only (slot coordinates stay fixed)
  const assignedFocal = rotateAndMix(focalQueue, shuffleSeed);
  const assignedBehind = rotateAndMix(behindQueue, shuffleSeed + 101);

  const focalSlots: BouquetSlot[] = SLOTS.filter((s) => s.zone === 'focal');
  const behindSlots: BouquetSlot[] = SLOTS.filter((s) => s.zone === 'behind');

  // Collect (item, slot) pairs using center-outward fill for focal blooms and behind-peek slots for fillers
  const pairs: { item: { bloomId: BloomId; ordinal: number }; slot: BouquetSlot; isBehindRole: boolean }[] = [];
  const usedSlotIndices = new Set<number>();

  // 1. Fill focal slots center-outward (Crown → Ring 2 → Perimeter)
  assignedFocal.forEach((item, idx) => {
    const slot = focalSlots[idx] ?? behindSlots[idx - focalSlots.length];
    if (slot) {
      usedSlotIndices.add(slot.index);
      pairs.push({ item, slot, isBehindRole: false });
    }
  });

  // 2. Fill behind/edge slots for Eucalyptus & Baby's Breath; overflow into unused outer perimeter slots pushed behind
  const remainingOuterSlots = focalSlots
    .filter((s) => !usedSlotIndices.has(s.index))
    .reverse();
  const behindPool = [...behindSlots.filter((s) => !usedSlotIndices.has(s.index)), ...remainingOuterSlots];

  assignedBehind.forEach((item, idx) => {
    const slot = behindPool[idx];
    if (slot) {
      usedSlotIndices.add(slot.index);
      pairs.push({ item, slot, isBehindRole: true });
    }
  });

  // Compute placements with deterministic jitter, single tie-point stem convergence, and depth shading
  const rawPlacements = pairs.map(({ item, slot, isBehindRole }) => {
    const def = BLOOM_MAP[item.bloomId];
    const seed =
      slot.index * 17.31 +
      item.ordinal * 7.13 +
      item.bloomId.length * 3.7;

    // Small deterministic rotation (±0.14 rad) & scale (0.96–1.04) jitter — stable across renders
    const jitterRot = (seededRandom(seed + 1.1) - 0.5) * 0.28;
    const jitterScale = 0.96 + seededRandom(seed + 2.3) * 0.08;

    // Push filler/foliage slightly behind focal blooms in Z so they peek out cleanly around & between petals
    const zOffset = isBehindRole ? -0.1 : 0;
    const x = slot.x;
    const y = slot.y + def.heightBias * 0.45;
    const z = slot.z + zOffset;

    // Depth factor: 0 = front-most (+0.42), 1 = back-most (-0.42)
    const depthFactor = Math.max(0, Math.min(1, (0.38 - z) / 0.78));

    // Back-row sprites are slightly smaller (up to ~7% smaller in back) in addition to slot ring scale
    const depthScaleFactor = 1 - depthFactor * 0.07;
    const finalScale = slot.scale * jitterScale * depthScaleFactor;

    const tiltRad = (slot.tilt * Math.PI) / 180;
    const radialAngle = Math.atan2(z, x);
    const tiltX = Math.sin(radialAngle) * tiltRad;
    const tiltZ = -Math.cos(radialAngle) * tiltRad;

    // Single convergence waist tie point beneath the wrap collar
    const stemTiePoint: [number, number, number] = [0, -0.78, 0];
    // Natural fan-out of cut stem ends peeking below the wrapped skirt
    const stemBottom: [number, number, number] = [
      x * 0.13 + (seededRandom(seed + 5.7) - 0.5) * 0.03,
      -1.58 - seededRandom(seed + 6.9) * 0.08,
      z * 0.1 + (seededRandom(seed + 7.3) - 0.5) * 0.03,
    ];

    return {
      key: `${item.bloomId}-${item.ordinal}`,
      bloomId: item.bloomId,
      slotIndex: slot.index,
      ring: slot.ring,
      zone: isBehindRole ? ('behind' as const) : ('focal' as const),
      seed,
      headPosition: [x, y, z] as [number, number, number],
      stemTiePoint,
      stemBottom,
      stemBase: stemTiePoint,
      tiltRad,
      tiltX,
      tiltZ,
      rotation: slot.rotation + jitterRot,
      yaw: radialAngle,
      scale: finalScale,
      depthFactor,
      renderOrder: 0,
    };
  });

  // Sort strictly back-to-front: behind greenery/fillers first (by z asc), then focal blooms (by z asc, then y desc)
  rawPlacements.sort((a, b) => {
    if (a.zone !== b.zone) {
      return a.zone === 'behind' ? -1 : 1;
    }
    if (Math.abs(a.headPosition[2] - b.headPosition[2]) > 0.005) {
      return a.headPosition[2] - b.headPosition[2];
    }
    return b.headPosition[1] - a.headPosition[1];
  });

  // Assign clean, non-overlapping renderOrder values:
  // 10..39 = behind foliage & fillers, 40..99 = focal & accent blooms (wrap sits at 110, ribbon 120, tag 130)
  let behindCursor = 12;
  let focalCursor = 42;
  return rawPlacements.map((p) => {
    if (p.zone === 'behind') {
      const ro = behindCursor;
      behindCursor += 2;
      return { ...p, renderOrder: ro };
    }
    const ro = focalCursor;
    focalCursor += 2;
    return { ...p, renderOrder: ro };
  });
}
