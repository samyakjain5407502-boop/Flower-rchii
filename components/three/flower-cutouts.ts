'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  BLOOMS,
  RIBBON_OPTIONS,
  WRAP_OPTIONS,
  type AvailableOptionalAssets,
  type BloomId,
  type RibbonId,
  type WrapId,
} from '@/lib/bouquet-data';

export interface ProcessedCutout {
  texture: THREE.CanvasTexture;
  shadowTexture: THREE.CanvasTexture;
  /** Cleaned, square-normalized transparent PNG data URL for 2D fallback rendering */
  dataUrl: string;
  /** True when the source PNG already included an alpha channel */
  hasNativeAlpha: boolean;
  /** True if this is a soft fallback placeholder (missing/unloaded file) */
  isPlaceholder: boolean;
}

export interface WrapRibbonPhotoMap {
  wraps: Partial<Record<WrapId, THREE.Texture>>;
  ribbons: Partial<Record<RibbonId, THREE.Texture>>;
}

const NORMALIZED_SIZE = 512;
const SQUARE_PAD = 14;

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Generates a soft Warm Ivory / Sage studio placeholder disc (zero clipart/emoji)
 * used while assets load or if an image fails to load.
 */
function createSoftPlaceholder(primaryHex: string, secondaryHex: string): ProcessedCutout {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size * 0.44,
      size * 0.42,
      size * 0.06,
      size * 0.5,
      size * 0.5,
      size * 0.42
    );
    grad.addColorStop(0, secondaryHex);
    grad.addColorStop(0.7, primaryHex);
    grad.addColorStop(1, 'rgba(235, 241, 236, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const sGrad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 52);
    sGrad.addColorStop(0, 'rgba(23, 39, 28, 0.55)');
    sGrad.addColorStop(1, 'rgba(23, 39, 28, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = true;
  texture.needsUpdate = true;

  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  shadowTexture.needsUpdate = true;

  return {
    texture,
    shadowTexture,
    dataUrl: canvas.toDataURL('image/png'),
    hasNativeAlpha: true,
    isPlaceholder: true,
  };
}

/**
 * Checks whether an RGBA image buffer contains a genuine transparent alpha channel.
 */
function detectAlphaChannel(data: Uint8ClampedArray): boolean {
  let transparentCount = 0;
  const step = 16; // sample every 4th pixel for speed
  for (let i = 3; i < data.length; i += step) {
    if (data[i] < 245) {
      transparentCount++;
      if (transparentCount > 24) return true;
    }
  }
  return false;
}

/**
 * One-time fallback border-connected cutout for opaque studio-white PNGs.
 * Preserves delicate alabaster petals on white lilies and baby's breath by using
 * tighter saturation/luminance thresholds for pale blooms.
 */
function runFallbackCutout(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bloomId: BloomId
): void {
  const isPaleBloom = bloomId === 'lily' || bloomId === 'babys-breath';

  const isBgPixel = (idx: number): boolean => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 20) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    if (isPaleBloom) {
      return r > 244 && g > 244 && b > 244 && sat < 11;
    }
    return r > 236 && g > 236 && b > 236 && sat < 22;
  };

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const trySeed = (px: number, py: number) => {
    const pos = py * w + px;
    if (visited[pos]) return;
    if (isBgPixel(pos * 4)) {
      visited[pos] = 1;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (head < tail) {
    const pos = queue[head++];
    const px = pos % w;
    const py = (pos - px) / w;

    if (px > 0) {
      const n = pos - 1;
      if (!visited[n] && isBgPixel(n * 4)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (px < w - 1) {
      const n = pos + 1;
      if (!visited[n] && isBgPixel(n * 4)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (py > 0) {
      const n = pos - w;
      if (!visited[n] && isBgPixel(n * 4)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (py < h - 1) {
      const n = pos + w;
      if (!visited[n] && isBgPixel(n * 4)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  // Also clear enclosed white pockets between branching stems on Baby's Breath and Eucalyptus
  if (bloomId === 'babys-breath' || bloomId === 'eucalyptus') {
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      if (data[idx + 3] === 0) continue;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (bloomId === 'babys-breath' && r > 247 && g > 247 && b > 247 && sat < 6) {
        data[idx + 3] = 0;
      } else if (bloomId === 'eucalyptus' && r > 240 && g > 240 && b > 240 && sat < 14) {
        data[idx + 3] = 0;
      }
    }
  }
}

/**
 * Tight botanical head crops for stems whose source photo includes a long bare stick
 * so every flower normalizes cleanly into the same visual bloom box.
 */
const BLOOM_HEAD_CROPS: Partial<Record<BloomId, [number, number, number, number]>> = {
  tulip: [0.12, 0.04, 0.86, 0.58],
  'babys-breath': [0.03, 0.04, 0.97, 0.67],
  eucalyptus: [0.06, 0.02, 0.94, 0.84],
};

/**
 * Processes a studio flower PNG into a unified, halo-free, square-normalized sprite:
 * 1. Native transparent PNG used directly; opaque PNGs trigger a dev warning + one-time fallback cutout.
 * 2. 1px alpha feather + edge pixel colour decontamination toward interior petal pigment (zero white halos).
 * 3. ONE unified warm studio colour grade across all flowers (warm ivory balance, top-left directional studio light,
 *    soft bottom-collar tuck shading, lifted blacks, highlights capped at #FAF7F2).
 * 4. Tightly trimmed and centered into a uniform 512×512 square canvas for consistent visual sizing.
 * 5. Premultiplied alpha texture + matching #17271C-tinted soft contact shadow texture.
 */
function processFlowerImage(
  img: HTMLImageElement,
  bloomId: BloomId,
  filePath: string
): ProcessedCutout {
  const fullW = img.naturalWidth || img.width || NORMALIZED_SIZE;
  const fullH = img.naturalHeight || img.height || NORMALIZED_SIZE;

  const [cx0, cy0, cx1, cy1] = BLOOM_HEAD_CROPS[bloomId] ?? [0, 0, 1, 1];
  const sx = Math.floor(fullW * cx0);
  const sy = Math.floor(fullH * cy0);
  const srcW = Math.max(32, Math.floor(fullW * (cx1 - cx0)));
  const srcH = Math.max(32, Math.floor(fullH * (cy1 - cy0)));

  const workScale = Math.min(1, 640 / Math.max(srcW, srcH));
  const w = Math.max(32, Math.round(srcW * workScale));
  const h = Math.max(32, Math.round(srcH * workScale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return createSoftPlaceholder('#EBF1EC', '#FAF7F2');
  }

  ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const hasNativeAlpha = detectAlphaChannel(data);

  if (!hasNativeAlpha) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[FLOWER rchii] "${filePath}" has no transparent alpha channel. Running one-time fallback cutout — replace this file with a true transparent PNG (top-front 45° studio pose) for optimal edge fidelity.`
      );
    }
    runFallbackCutout(data, w, h, bloomId);
  }

  // Step 1: 1px alpha feather + edge pixel colour decontamination toward interior petal colour
  const alphaSnap = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alphaSnap[i] = data[i * 4 + 3];

  const offsets = [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pos = y * w + x;
      const a = alphaSnap[pos];
      if (a === 0) continue;

      let transparentNeighbors = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let opaqueCount = 0;

      for (let k = 0; k < 8; k++) {
        const npos = pos + offsets[k];
        const na = alphaSnap[npos];
        if (na < 24) {
          transparentNeighbors++;
        } else if (na > 220) {
          sumR += data[npos * 4];
          sumG += data[npos * 4 + 1];
          sumB += data[npos * 4 + 2];
          opaqueCount++;
        }
      }

      if (transparentNeighbors > 0) {
        const idx = pos * 4;
        // 1px soft alpha feather on boundary pixels
        const featherFactor =
          transparentNeighbors >= 5
            ? 0.28
            : transparentNeighbors >= 3
              ? 0.52
              : 0.78;
        data[idx + 3] = Math.round(a * featherFactor);

        // Decontaminate edge pixels strongly toward interior petal colour (no white fringe)
        if (opaqueCount > 0) {
          const avgR = sumR / opaqueCount;
          const avgG = sumG / opaqueCount;
          const avgB = sumB / opaqueCount;
          const pull = !hasNativeAlpha ? 0.68 : 0.42;
          data[idx] = clampByte(data[idx] * (1 - pull) + avgR * pull);
          data[idx + 1] = clampByte(data[idx + 1] * (1 - pull) + avgG * pull);
          data[idx + 2] = clampByte(data[idx + 2] * (1 - pull) + avgB * pull);
        }
      }
    }
  }

  // Step 2: ONE unified warm studio colour grade + subtle top-left directional shading
  // Warm balance, soft lower-collar shading so blooms sit naturally inside the bouquet,
  // slightly lifted forest-tinted blacks (never pure #000000), highlights capped at #FAF7F2
  for (let y = 0; y < h; y++) {
    const ny = y / Math.max(1, h - 1); // 0 = top, 1 = bottom
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] === 0) continue;

      const nx = x / Math.max(1, w - 1); // 0 = left, 1 = right
      // Subtle studio top-left key light + gentle bottom-right falloff (~10% directional modeling)
      const directional = 1.04 - (nx * 0.045 + ny * 0.095);
      // Soft collar-tuck shadow on bottom 25% so blooms look seated into adjacent petals & wrap
      const bottomTuck = ny > 0.72 ? 1 - ((ny - 0.72) / 0.28) * 0.14 : 1;
      const lightMul = directional * bottomTuck;

      // Gentle warm studio white balance
      let r = data[idx] * 1.018 * lightMul;
      let g = data[idx + 1] * 1.002 * lightMul;
      let b = data[idx + 2] * 0.962 * lightMul;

      // Subtle filmic S-curve micro-contrast around warm mid-tone
      r = (r - 128) * 1.06 + 128;
      g = (g - 128) * 1.06 + 128;
      b = (b - 128) * 1.06 + 128;

      // Slightly lifted blacks toward Deep Botanical Forest Green (#17271C -> 23, 39, 28)
      r = 14 + r * (236 / 255);
      g = 19 + g * (228 / 255);
      b = 15 + b * (227 / 255);

      // Highlights strictly capped at Warm Ivory (#FAF7F2 -> 250, 247, 242)
      data[idx] = Math.min(250, clampByte(r));
      data[idx + 1] = Math.min(247, clampByte(g));
      data[idx + 2] = Math.min(242, clampByte(b));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Step 3: Trim transparent padding & normalize into a uniform 512×512 square box
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = w - 1;
    maxY = h - 1;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const innerBox = NORMALIZED_SIZE - SQUARE_PAD * 2;
  const fitScale = innerBox / Math.max(cropW, cropH);
  const drawW = cropW * fitScale;
  const drawH = cropH * fitScale;
  const offsetX = (NORMALIZED_SIZE - drawW) * 0.5;
  const offsetY = (NORMALIZED_SIZE - drawH) * 0.5;

  const squareCanvas = document.createElement('canvas');
  squareCanvas.width = NORMALIZED_SIZE;
  squareCanvas.height = NORMALIZED_SIZE;
  const sCtx = squareCanvas.getContext('2d');
  if (sCtx) {
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(work, minX, minY, cropW, cropH, offsetX, offsetY, drawW, drawH);
  }

  // Step 4: Matching soft contact-shadow silhouette tinted Deep Forest Green (#17271C, never pure black)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shCtx = shadowCanvas.getContext('2d');
  if (shCtx) {
    shCtx.filter = 'blur(7px)';
    shCtx.drawImage(squareCanvas, 10, 10, 108, 108);
    shCtx.filter = 'none';
    shCtx.globalCompositeOperation = 'source-in';
    shCtx.fillStyle = '#17271C';
    shCtx.fillRect(0, 0, 128, 128);
  }

  const texture = new THREE.CanvasTexture(squareCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = true;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  shadowTexture.premultiplyAlpha = true;
  shadowTexture.needsUpdate = true;

  return {
    texture,
    shadowTexture,
    dataUrl: squareCanvas.toDataURL('image/png'),
    hasNativeAlpha,
    isPlaceholder: false,
  };
}

let cachedCutoutsPromise: Promise<Record<BloomId, ProcessedCutout>> | null = null;
let resolvedCutouts: Record<BloomId, ProcessedCutout> | null = null;

function loadAllFlowerCutouts(): Promise<Record<BloomId, ProcessedCutout>> {
  if (cachedCutoutsPromise) return cachedCutoutsPromise;

  cachedCutoutsPromise = Promise.all(
    BLOOMS.map(
      (bloom) =>
        new Promise<[BloomId, ProcessedCutout]>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            resolve([bloom.id, processFlowerImage(img, bloom.id, bloom.imagePath)]);
          };
          img.onerror = () => {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                `[FLOWER rchii] Missing flower asset "${bloom.imagePath}" — rendering soft botanical placeholder.`
              );
            }
            resolve([
              bloom.id,
              createSoftPlaceholder(bloom.swatchPrimary, bloom.swatchSecondary),
            ]);
          };
          img.src = bloom.imagePath;
        })
    )
  ).then((entries) => {
    const map = {} as Record<BloomId, ProcessedCutout>;
    for (const [id, cutout] of entries) {
      map[id] = cutout;
    }
    resolvedCutouts = map;
    return map;
  });

  return cachedCutoutsPromise;
}

export function useFlowerCutouts(): Record<BloomId, ProcessedCutout> | null {
  const [cutouts, setCutouts] = useState<Record<BloomId, ProcessedCutout> | null>(
    () => resolvedCutouts
  );

  useEffect(() => {
    if (resolvedCutouts) return;
    let active = true;
    loadAllFlowerCutouts().then((loaded) => {
      if (active) setCutouts(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  return cutouts;
}

let loggedOptionalAssetsNote = false;
const cachedPhotoTextures = new Map<string, THREE.Texture>();

function loadPhotoTexture(path: string): Promise<THREE.Texture | null> {
  const existing = cachedPhotoTextures.get(path);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.premultiplyAlpha = true;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      cachedPhotoTextures.set(path, tex);
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = path;
  });
}

/**
 * Loads optional real-photo transparent PNGs for Korean wraps (/public/wraps/wrap-*.png)
 * and ribbons (/public/ribbons/ribbon-*.png) ONLY when detected on disk by the server,
 * preventing 404 console errors while automatically upgrading from the procedural wrap when uploaded.
 */
export function useWrapRibbonPhotos(
  availableAssets: AvailableOptionalAssets
): WrapRibbonPhotoMap {
  const [photos, setPhotos] = useState<WrapRibbonPhotoMap>({
    wraps: {},
    ribbons: {},
  });

  useEffect(() => {
    let active = true;

    const missingWraps = WRAP_OPTIONS.filter((w) => !availableAssets.wraps[w.id]);
    const missingRibbons = RIBBON_OPTIONS.filter((r) => !availableAssets.ribbons[r.id]);

    if (
      process.env.NODE_ENV === 'development' &&
      !loggedOptionalAssetsNote &&
      (missingWraps.length > 0 || missingRibbons.length > 0)
    ) {
      loggedOptionalAssetsNote = true;
      const missingPaths = [
        ...missingWraps.map((w) => `/public${w.photoPath}`),
        ...missingRibbons.map((r) => `/public${r.photoPath}`),
      ];
      console.info(
        `[FLOWER rchii] Using procedural Korean wrap/ribbon fallback. Upload optional real-photo transparent PNGs to upgrade automatically:\n  - ${missingPaths.join('\n  - ')}`
      );
    }

    const wrapTasks = WRAP_OPTIONS.filter((w) => availableAssets.wraps[w.id]).map(
      async (w) => [w.id, await loadPhotoTexture(w.photoPath)] as const
    );
    const ribbonTasks = RIBBON_OPTIONS.filter((r) => availableAssets.ribbons[r.id]).map(
      async (r) => [r.id, await loadPhotoTexture(r.photoPath)] as const
    );

    if (wrapTasks.length === 0 && ribbonTasks.length === 0) return;

    Promise.all([Promise.all(wrapTasks), Promise.all(ribbonTasks)]).then(
      ([wrapEntries, ribbonEntries]) => {
        if (!active) return;
        const nextWraps: Partial<Record<WrapId, THREE.Texture>> = {};
        for (const [id, tex] of wrapEntries) {
          if (tex) nextWraps[id] = tex;
        }
        const nextRibbons: Partial<Record<RibbonId, THREE.Texture>> = {};
        for (const [id, tex] of ribbonEntries) {
          if (tex) nextRibbons[id] = tex;
        }
        setPhotos({ wraps: nextWraps, ribbons: nextRibbons });
      }
    );

    return () => {
      active = false;
    };
  }, [availableAssets]);

  return photos;
}
