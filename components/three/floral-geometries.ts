'use client';

import * as THREE from 'three';

/**
 * Generates a curved parametric organic petal BufferGeometry with subtle edge curl,
 * deep cupping, and optional scalloped ruffles.
 * Pivot is at the petal base (0, 0, 0) growing along +Y and curving outward along +Z.
 */
function buildCurvedPetalGeometry(options: {
  width: number;
  height: number;
  cupDepth: number;
  tipCurl: number;
  lipReflex?: number;
  taperTop: number;
  ruffleAmp?: number;
  ruffleFreq?: number;
  pointedTip?: boolean;
  segU?: number;
  segV?: number;
}): THREE.BufferGeometry {
  const {
    width,
    height,
    cupDepth,
    tipCurl,
    lipReflex = 0,
    taperTop,
    ruffleAmp = 0,
    ruffleFreq = 4,
    pointedTip = false,
    segU = 12,
    segV = 14,
  } = options;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = base, 1 = tip
    let widthProfile: number;

    if (pointedTip) {
      widthProfile = Math.sin(Math.pow(v, 0.72) * Math.PI) * (1 - 0.1 * v);
    } else {
      // Heart-rounded florist petal silhouette: slender pinch at claw, plump upper crown
      const basePinch = Math.pow(
        Math.sin(Math.min(1, v * 1.2) * (Math.PI / 2)),
        0.58
      );
      const topRound =
        v > 0.68
          ? Math.cos(((v - 0.68) / 0.32) * (Math.PI / 2)) * (1 - taperTop) +
            taperTop
          : 1;
      // Subtle center cleft on rose/peony upper rim
      widthProfile = basePinch * (0.24 + 0.76 * topRound);
    }

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const s = u * 2 - 1; // -1..1 across petal width

      const x = s * (width * 0.5) * widthProfile;

      // Deep natural cup in lower/mid body
      const cup = (1 - s * s) * cupDepth * Math.sin(v * Math.PI);

      // Gentle outward arch + distinct reflexed rose lip curl near upper edge (v > 0.65)
      const outwardArch = Math.pow(v, 1.8) * tipCurl;
      const lipFactor = Math.max(0, (v - 0.62) / 0.38);
      const reflex =
        lipReflex *
        Math.pow(lipFactor, 2.0) *
        (0.55 + 0.45 * (1 - s * s * 0.5));

      // Multi-harmonic organic edge ruffle for peonies & outer rose petals
      const ruffle =
        ruffleAmp > 0
          ? (Math.sin(s * Math.PI * ruffleFreq) * 0.7 +
              Math.cos(s * Math.PI * (ruffleFreq * 1.7 + 1)) * 0.3) *
            ruffleAmp *
            Math.pow(v, 1.55)
          : 0;

      const z = -cup + outwardArch + reflex + ruffle;

      // Natural foreshortening when the lip curls back + tiny scalloped rim dip
      const rimNotch =
        !pointedTip && v > 0.85
          ? (1 - s * s) * 0.008 * ((v - 0.85) / 0.15)
          : 0;
      const y =
        v * height -
        Math.pow(v, 2.6) * Math.max(0, tipCurl + lipReflex * 0.8) * 0.3 -
        rimNotch;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (segU + 1) + iu;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates an organically creased Korean-style florist wrapping sheet.
 * Supports tall diamond/pleated halo sheets, angled side wings, low-cut front V-folds,
 * and crinkled inner cream tissue paper liners.
 */
function buildKoreanWrapSheetGeometry(options: {
  topWidth: number;
  bottomWidth: number;
  height: number;
  arcAngle: number;
  baseRadius: number;
  topRadius: number;
  pleatCount: number;
  pleatDepth: number;
  crownPeak: number; // + rises to center diamond peak, - dips into front V-fold
  crinkleAmp?: number;
  skewX?: number;
  segU?: number;
  segV?: number;
}): THREE.BufferGeometry {
  const {
    topWidth,
    bottomWidth,
    height,
    arcAngle,
    baseRadius,
    topRadius,
    pleatCount,
    pleatDepth,
    crownPeak,
    crinkleAmp = 0,
    skewX = 0,
    segU = 28,
    segV = 20,
  } = options;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = cinched waist, 1 = top flared rim
    const vFlare = Math.pow(v, 0.86);
    const widthScale =
      THREE.MathUtils.lerp(bottomWidth, topWidth, vFlare) /
      Math.max(0.25, topWidth);

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const s = u * 2 - 1; // -1..1 across sheet

      const theta = s * arcAngle * 0.5;

      // Crisp accordion / editorial paper pleats deepening toward the upper rim
      const pleatPhase = s * Math.PI * pleatCount;
      const pleatWave = Math.sin(pleatPhase) * pleatDepth * Math.pow(v, 1.15);

      // Asymmetric organic crease folds so paper never looks mechanically cylindrical
      const organicFold =
        (Math.sin(s * 5.2 + v * 3.1) * 0.55 +
          Math.cos(s * 9.7 - v * 5.4) * 0.45) *
        (0.016 + crinkleAmp) *
        Math.pow(v, 0.9);

      // High-frequency crisp tissue crinkle when crinkleAmp > 0
      const fineCrinkle =
        crinkleAmp > 0
          ? (Math.sin(s * 23.0 + v * 17.0) * 0.5 +
              Math.cos(s * 31.0 - v * 21.0) * 0.5) *
            crinkleAmp *
            0.55 *
            v
          : 0;

      // Soft outward curl near top lip of Korean paper
      const topBellFlare = Math.pow(v, 2.4) * 0.14;
      const r =
        THREE.MathUtils.lerp(baseRadius, topRadius, vFlare) +
        pleatWave +
        organicFold +
        fineCrinkle +
        topBellFlare;

      const x =
        Math.sin(theta) * r * (0.65 + 0.42 * widthScale) + skewX * v;
      const z = Math.cos(theta) * r;

      // Editorial crown silhouette: tall halo diamond peak (+crownPeak) OR low front V-fold (-crownPeak)
      const edgeProfile = 1 - Math.abs(s); // 1 at center, 0 at edges
      const crownOffset =
        crownPeak >= 0
          ? (Math.pow(edgeProfile, 0.85) - 0.35) * crownPeak * v
          : -Math.pow(edgeProfile, 1.25) * Math.abs(crownPeak) * v;

      // Subtle paper crinkle ripple along top edge
      const rimWave =
        Math.sin(s * Math.PI * (pleatCount + 1)) * 0.022 * Math.pow(v, 1.8);

      const y = v * height + crownOffset + rimWave;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (segU + 1) + iu;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a swept ribbon strip geometry along a 3D CatmullRom curve.
 */
function buildRibbonStripGeometry(
  points: THREE.Vector3[],
  width: number,
  segments = 36,
  twistFn?: (t: number) => number,
  taperTip = false
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segments, false);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pt = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const offset = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, pt);
    binormal.copy(frames.binormals[i]);
    normal.copy(frames.normals[i]);

    const twist = twistFn ? twistFn(t) : 0;
    const cosT = Math.cos(twist);
    const sinT = Math.sin(twist);
    const localWidth = taperTip && t > 0.9 ? width * (1 - (t - 0.9) * 3.5) : width;

    offset
      .set(0, 0, 0)
      .addScaledVector(binormal, cosT)
      .addScaledVector(normal, sinT)
      .normalize()
      .multiplyScalar(localWidth * 0.5);

    positions.push(pt.x - offset.x, pt.y - offset.y, pt.z - offset.z);
    positions.push(pt.x + offset.x, pt.y + offset.y, pt.z + offset.z);
    uvs.push(0, t, 1, t);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, d);
    indices.push(a, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates an oval-arched luxury cardstock tag geometry with smooth bevel.
 */
function buildOvalTagGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const rx = 0.21;
  const ry = 0.295;
  shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 32,
  });
  geo.center();

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const u = px / (rx * 2) + 0.5;
    const v = py / (ry * 2) + 0.5;
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Generates a subtly dome-curved 3D plane (1×1 unit) for photorealistic botanical cutouts.
 * The gentle forward pillow curvature gives real studio flower photography volumetric depth
 * and soft natural shading as the camera orbits.
 */
function buildCurvedCutoutCardGeometry(curveDepth = 0.075): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1, 1, 10, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); // -0.5..0.5
    const y = pos.getY(i); // -0.5..0.5
    const r2 = Math.min(1, (x * x + y * y) * 3.4);
    const z = (1 - r2) * curveDepth;
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a realistic botanical petal CanvasTexture with a deep base-to-luminous-edge
 * radial gradient, subtle curved organic petal veins, and micro-velvet grain.
 */
function buildPetalTexture(options: {
  baseColor: string;
  midColor: string;
  edgeColor: string;
  veinColor: string;
  freckleColor?: string;
}): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Natural radial gradient anchored near the petal claw (v=0 => bottom of canvas)
    const grad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.96,
      size * 0.06,
      size * 0.5,
      size * 0.52,
      size * 0.92
    );
    grad.addColorStop(0.0, options.baseColor);
    grad.addColorStop(0.42, options.midColor);
    grad.addColorStop(0.84, options.edgeColor);
    grad.addColorStop(1.0, options.edgeColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // 2. Delicate fanning botanical veins curving from base toward outer edge
    ctx.save();
    ctx.strokeStyle = options.veinColor;
    ctx.lineCap = 'round';
    const veinCount = 19;
    for (let i = 0; i < veinCount; i++) {
      const t = i / (veinCount - 1) - 0.5; // -0.5..0.5
      const startX = size * 0.5 + t * size * 0.16;
      const ctrlX = size * 0.5 + t * size * 0.72;
      const endX = size * 0.5 + t * size * 1.12;
      const endY = size * (0.04 + Math.abs(t) * 0.24);

      ctx.lineWidth = Math.abs(t) < 0.08 ? 1.6 : 0.95;
      ctx.globalAlpha = Math.abs(t) < 0.15 ? 0.22 : 0.14;
      ctx.beginPath();
      ctx.moveTo(startX, size);
      ctx.quadraticCurveTo(ctrlX, size * 0.48, endX, endY);
      ctx.stroke();
    }

    // 3. Soft velvet micro-stipple texture so petals catch sheen organically
    ctx.globalAlpha = 0.045;
    for (let i = 0; i < 420; i++) {
      const rx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const ry = ((Math.sin(i * 78.233) * 24634.6345) % 1 + 1) % 1;
      ctx.fillStyle = i % 2 === 0 ? '#FAF7F2' : '#17271C';
      ctx.fillRect(rx * size, ry * size, 2, 2);
    }

    // Optional oriental lily throat freckles
    if (options.freckleColor) {
      ctx.fillStyle = options.freckleColor;
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 18; i++) {
        const fx = size * (0.36 + (((i * 37) % 100) / 100) * 0.28);
        const fy = size * (0.58 + (((i * 53) % 100) / 100) * 0.28);
        ctx.beginPath();
        ctx.ellipse(fx, fy, 1.6, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a subtle tactile paper crease & cotton-rag bump texture for Korean wrapping paper
 * and crinkled inner white/cream tissue liners.
 */
function buildPaperBumpTexture(crinkleIntensity: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Organic folded paper crease facets
    const creaseCount = crinkleIntensity > 0.5 ? 55 : 24;
    for (let i = 0; i < creaseCount; i++) {
      const x1 = (((Math.sin(i * 17.3) * 43758.54) % 1) + 1) % 1;
      const y1 = (((Math.sin(i * 31.7) * 21931.12) % 1) + 1) % 1;
      const angle = (((Math.sin(i * 53.1) * 19381.4) % 1) + 1) % 1 * Math.PI * 2;
      const len = (0.2 + (i % 5) * 0.14) * size;

      const grad = ctx.createLinearGradient(
        x1 * size,
        y1 * size,
        x1 * size + Math.cos(angle) * len,
        y1 * size + Math.sin(angle) * len
      );
      const bright = i % 2 === 0 ? 155 : 100;
      grad.addColorStop(0, `rgba(${bright}, ${bright}, ${bright}, 0)`);
      grad.addColorStop(0.5, `rgba(${bright}, ${bright}, ${bright}, ${0.22 * crinkleIntensity})`);
      grad.addColorStop(1, `rgba(${bright}, ${bright}, ${bright}, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = crinkleIntensity > 0.5 ? 6 : 10;
      ctx.beginPath();
      ctx.moveTo(x1 * size, y1 * size);
      ctx.lineTo(x1 * size + Math.cos(angle) * len, y1 * size + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Subtle cotton-rag fiber grain
    for (let i = 0; i < 650; i++) {
      const gx = (((Math.sin(i * 91.1) * 14358.2) % 1) + 1) % 1;
      const gy = (((Math.sin(i * 47.9) * 32918.7) % 1) + 1) % 1;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(250,247,242,0.08)' : 'rgba(23,39,28,0.08)';
      ctx.fillRect(gx * size, gy * size, 2, 1.5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

export interface SharedFloralTextures {
  redRoseInner: THREE.CanvasTexture;
  redRoseOuter: THREE.CanvasTexture;
  blushRoseInner: THREE.CanvasTexture;
  blushRoseOuter: THREE.CanvasTexture;
  peonyInner: THREE.CanvasTexture;
  peonyOuter: THREE.CanvasTexture;
  tulipPetal: THREE.CanvasTexture;
  lilyPetal: THREE.CanvasTexture;
  ruscusLeaf: THREE.CanvasTexture;
  eucalyptusLeaf: THREE.CanvasTexture;
  wrapPaperBump: THREE.CanvasTexture;
  tissueCrinkleBump: THREE.CanvasTexture;
}

let cachedTextures: SharedFloralTextures | null = null;

export function getFloralTextures(): SharedFloralTextures {
  if (cachedTextures) return cachedTextures;

  cachedTextures = {
    redRoseInner: buildPetalTexture({
      baseColor: '#35060E',
      midColor: '#69101E',
      edgeColor: '#9C1F32',
      veinColor: '#2B040A',
    }),
    redRoseOuter: buildPetalTexture({
      baseColor: '#4F0B17',
      midColor: '#841729',
      edgeColor: '#B73448',
      veinColor: '#3C0710',
    }),
    blushRoseInner: buildPetalTexture({
      baseColor: '#BC6C7B',
      midColor: '#DF9EA9',
      edgeColor: '#F5D5DA',
      veinColor: '#9F5362',
    }),
    blushRoseOuter: buildPetalTexture({
      baseColor: '#CE8694',
      midColor: '#EAB9C2',
      edgeColor: '#FCF0F2',
      veinColor: '#B5707E',
    }),
    peonyInner: buildPetalTexture({
      baseColor: '#DC8D9E',
      midColor: '#F2BAC6',
      edgeColor: '#FDE8ED',
      veinColor: '#C57486',
    }),
    peonyOuter: buildPetalTexture({
      baseColor: '#E8A8B6',
      midColor: '#F7D2DA',
      edgeColor: '#FFF7F9',
      veinColor: '#CF8B9B',
    }),
    tulipPetal: buildPetalTexture({
      baseColor: '#D6896E',
      midColor: '#EBB79E',
      edgeColor: '#FCE6D8',
      veinColor: '#BA7057',
    }),
    lilyPetal: buildPetalTexture({
      baseColor: '#DDE3C7',
      midColor: '#FAF8F1',
      edgeColor: '#FAF7F2',
      veinColor: '#C8CEB4',
      freckleColor: '#B3783A',
    }),
    ruscusLeaf: buildPetalTexture({
      baseColor: '#172C1B',
      midColor: '#25422B',
      edgeColor: '#3A5B40',
      veinColor: '#102013',
    }),
    eucalyptusLeaf: buildPetalTexture({
      baseColor: '#456149',
      midColor: '#638067',
      edgeColor: '#88A58C',
      veinColor: '#354D38',
    }),
    wrapPaperBump: buildPaperBumpTexture(0.45),
    tissueCrinkleBump: buildPaperBumpTexture(0.95),
  };

  return cachedTextures;
}

export interface SharedFloralGeometries {
  roseBudPetal: THREE.BufferGeometry;
  roseInnerPetal: THREE.BufferGeometry;
  roseMidPetal: THREE.BufferGeometry;
  roseOuterPetal: THREE.BufferGeometry;
  peonyInnerPetal: THREE.BufferGeometry;
  peonyMidPetal: THREE.BufferGeometry;
  peonyOuterPetal: THREE.BufferGeometry;
  tulipPetal: THREE.BufferGeometry;
  lilyPetal: THREE.BufferGeometry;
  ruscusLeaf: THREE.BufferGeometry;
  eucalyptusLeaf: THREE.BufferGeometry;
  babysBreathFloret: THREE.BufferGeometry;
  stemCylinder: THREE.BufferGeometry;
  sepalLeaf: THREE.BufferGeometry;
  // 5 Korean-style overlapping creased wrapping sheets
  koreanHaloCenter: THREE.BufferGeometry;
  koreanHaloWing: THREE.BufferGeometry;
  koreanSideFold: THREE.BufferGeometry;
  koreanFrontVFold: THREE.BufferGeometry;
  lowerPleatedSkirt: THREE.BufferGeometry;
  // Crinkled inner white/cream tissue liner sheets
  tissueBackCrinkle: THREE.BufferGeometry;
  tissueFrontCrinkle: THREE.BufferGeometry;
  // Couture 4-loop satin bow & flowing ribbon tails
  ribbonCollar: THREE.BufferGeometry;
  bowUpperLeft: THREE.BufferGeometry;
  bowUpperRight: THREE.BufferGeometry;
  bowLowerLeft: THREE.BufferGeometry;
  bowLowerRight: THREE.BufferGeometry;
  ribbonTailLeft: THREE.BufferGeometry;
  ribbonTailRight: THREE.BufferGeometry;
  giftTagOval: THREE.BufferGeometry;
  giftTagCord: THREE.BufferGeometry;
  cutoutBloomCard: THREE.BufferGeometry;
  cutoutShadowCard: THREE.BufferGeometry;
}

let cachedGeometries: SharedFloralGeometries | null = null;

export function getFloralGeometries(): SharedFloralGeometries {
  if (cachedGeometries) return cachedGeometries;

  // Couture 4-loop satin bow curves
  const bowUpperLeftPts = [
    new THREE.Vector3(0, 0.01, 0),
    new THREE.Vector3(-0.17, 0.19, 0.11),
    new THREE.Vector3(-0.34, 0.12, 0.09),
    new THREE.Vector3(-0.22, -0.02, 0.05),
    new THREE.Vector3(0, 0, 0.01),
  ];

  const bowUpperRightPts = [
    new THREE.Vector3(0, 0.01, 0),
    new THREE.Vector3(0.17, 0.19, 0.11),
    new THREE.Vector3(0.34, 0.12, 0.09),
    new THREE.Vector3(0.22, -0.02, 0.05),
    new THREE.Vector3(0, 0, 0.01),
  ];

  const bowLowerLeftPts = [
    new THREE.Vector3(0, -0.01, 0.01),
    new THREE.Vector3(-0.22, 0.03, 0.12),
    new THREE.Vector3(-0.38, -0.1, 0.11),
    new THREE.Vector3(-0.2, -0.17, 0.06),
    new THREE.Vector3(0, -0.02, 0.01),
  ];

  const bowLowerRightPts = [
    new THREE.Vector3(0, -0.01, 0.01),
    new THREE.Vector3(0.22, 0.03, 0.12),
    new THREE.Vector3(0.38, -0.1, 0.11),
    new THREE.Vector3(0.2, -0.17, 0.06),
    new THREE.Vector3(0, -0.02, 0.01),
  ];

  const tailLeftPts = [
    new THREE.Vector3(-0.02, -0.02, 0.03),
    new THREE.Vector3(-0.15, -0.24, 0.11),
    new THREE.Vector3(-0.17, -0.52, 0.06),
    new THREE.Vector3(-0.27, -0.84, 0.15),
    new THREE.Vector3(-0.32, -1.04, 0.12),
  ];

  const tailRightPts = [
    new THREE.Vector3(0.02, -0.02, 0.03),
    new THREE.Vector3(0.13, -0.26, 0.12),
    new THREE.Vector3(0.2, -0.56, 0.07),
    new THREE.Vector3(0.25, -0.88, 0.16),
    new THREE.Vector3(0.34, -1.12, 0.14),
  ];

  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.03, 0.0, 0.02),
    new THREE.Vector3(0.19, -0.15, 0.1),
    new THREE.Vector3(0.3, -0.29, 0.14),
    new THREE.Vector3(0.35, -0.45, 0.15),
  ]);

  cachedGeometries = {
    // 4 graduated sculpted rose petal profiles for 25+ dense spiraled petals
    roseBudPetal: buildCurvedPetalGeometry({
      width: 0.13,
      height: 0.175,
      cupDepth: 0.065,
      tipCurl: 0.015,
      lipReflex: 0.018,
      taperTop: 0.45,
      segU: 10,
      segV: 12,
    }),
    roseInnerPetal: buildCurvedPetalGeometry({
      width: 0.175,
      height: 0.21,
      cupDepth: 0.075,
      tipCurl: 0.035,
      lipReflex: 0.045,
      taperTop: 0.55,
      ruffleAmp: 0.005,
      ruffleFreq: 3,
      segU: 10,
      segV: 12,
    }),
    roseMidPetal: buildCurvedPetalGeometry({
      width: 0.215,
      height: 0.24,
      cupDepth: 0.08,
      tipCurl: 0.065,
      lipReflex: 0.075,
      taperTop: 0.58,
      ruffleAmp: 0.008,
      ruffleFreq: 3.5,
      segU: 12,
      segV: 12,
    }),
    roseOuterPetal: buildCurvedPetalGeometry({
      width: 0.25,
      height: 0.265,
      cupDepth: 0.078,
      tipCurl: 0.09,
      lipReflex: 0.115,
      taperTop: 0.56,
      ruffleAmp: 0.011,
      ruffleFreq: 4,
      segU: 12,
      segV: 14,
    }),

    // Lush deeply ruffled peony petals
    peonyInnerPetal: buildCurvedPetalGeometry({
      width: 0.19,
      height: 0.22,
      cupDepth: 0.085,
      tipCurl: 0.015,
      lipReflex: 0.025,
      taperTop: 0.72,
      ruffleAmp: 0.024,
      ruffleFreq: 5.5,
      segU: 12,
      segV: 12,
    }),
    peonyMidPetal: buildCurvedPetalGeometry({
      width: 0.245,
      height: 0.265,
      cupDepth: 0.092,
      tipCurl: 0.045,
      lipReflex: 0.05,
      taperTop: 0.7,
      ruffleAmp: 0.028,
      ruffleFreq: 6,
      segU: 14,
      segV: 12,
    }),
    peonyOuterPetal: buildCurvedPetalGeometry({
      width: 0.295,
      height: 0.295,
      cupDepth: 0.088,
      tipCurl: 0.08,
      lipReflex: 0.075,
      taperTop: 0.68,
      ruffleAmp: 0.032,
      ruffleFreq: 6.5,
      segU: 14,
      segV: 14,
    }),

    tulipPetal: buildCurvedPetalGeometry({
      width: 0.185,
      height: 0.34,
      cupDepth: 0.09,
      tipCurl: -0.025,
      lipReflex: 0.012,
      taperTop: 0.32,
      segU: 10,
      segV: 12,
    }),

    lilyPetal: buildCurvedPetalGeometry({
      width: 0.195,
      height: 0.43,
      cupDepth: 0.036,
      tipCurl: 0.18,
      lipReflex: 0.08,
      taperTop: 0.04,
      pointedTip: true,
      ruffleAmp: 0.008,
      ruffleFreq: 4,
      segU: 10,
      segV: 14,
    }),

    // Pointed dark botanical Ruscus filler leaf
    ruscusLeaf: buildCurvedPetalGeometry({
      width: 0.145,
      height: 0.32,
      cupDepth: 0.016,
      tipCurl: 0.075,
      taperTop: 0.04,
      pointedTip: true,
      segU: 7,
      segV: 9,
    }),

    eucalyptusLeaf: buildCurvedPetalGeometry({
      width: 0.185,
      height: 0.175,
      cupDepth: 0.024,
      tipCurl: 0.02,
      taperTop: 0.78,
      segU: 8,
      segV: 8,
    }),

    babysBreathFloret: new THREE.IcosahedronGeometry(0.023, 1),
    stemCylinder: new THREE.CylinderGeometry(0.015, 0.018, 1, 8, 1),
    sepalLeaf: buildCurvedPetalGeometry({
      width: 0.08,
      height: 0.19,
      cupDepth: 0.018,
      tipCurl: 0.09,
      taperTop: 0.06,
      pointedTip: true,
      segU: 5,
      segV: 7,
    }),

    // 5 Korean-style overlapping pleated & creased wrapping sheets
    koreanHaloCenter: buildKoreanWrapSheetGeometry({
      topWidth: 1.95,
      bottomWidth: 0.44,
      height: 2.38,
      arcAngle: Math.PI * 0.72,
      baseRadius: 0.24,
      topRadius: 1.06,
      pleatCount: 6,
      pleatDepth: 0.055,
      crownPeak: 0.36,
      crinkleAmp: 0.014,
    }),
    koreanHaloWing: buildKoreanWrapSheetGeometry({
      topWidth: 1.65,
      bottomWidth: 0.42,
      height: 2.22,
      arcAngle: Math.PI * 0.62,
      baseRadius: 0.25,
      topRadius: 1.02,
      pleatCount: 5,
      pleatDepth: 0.048,
      crownPeak: 0.3,
      crinkleAmp: 0.015,
    }),
    koreanSideFold: buildKoreanWrapSheetGeometry({
      topWidth: 1.44,
      bottomWidth: 0.44,
      height: 1.84,
      arcAngle: Math.PI * 0.64,
      baseRadius: 0.26,
      topRadius: 0.94,
      pleatCount: 4,
      pleatDepth: 0.04,
      crownPeak: 0.14,
      crinkleAmp: 0.012,
    }),
    koreanFrontVFold: buildKoreanWrapSheetGeometry({
      topWidth: 1.62,
      bottomWidth: 0.46,
      height: 1.44,
      arcAngle: Math.PI * 0.94,
      baseRadius: 0.27,
      topRadius: 0.88,
      pleatCount: 5,
      pleatDepth: 0.034,
      crownPeak: -0.34, // Clean low-cut front V-dip revealing the lush floral dome
      crinkleAmp: 0.01,
    }),
    lowerPleatedSkirt: buildKoreanWrapSheetGeometry({
      topWidth: 1.05,
      bottomWidth: 0.44,
      height: 0.98,
      arcAngle: Math.PI * 1.98,
      baseRadius: 0.25,
      topRadius: 0.56,
      pleatCount: 12,
      pleatDepth: 0.032,
      crownPeak: 0.04,
      crinkleAmp: 0.012,
      segU: 40,
      segV: 12,
    }),

    // Crisp crinkled white/cream inner tissue paper liners peeking between blooms & wrap
    tissueBackCrinkle: buildKoreanWrapSheetGeometry({
      topWidth: 1.72,
      bottomWidth: 0.42,
      height: 2.04,
      arcAngle: Math.PI * 1.28,
      baseRadius: 0.22,
      topRadius: 0.92,
      pleatCount: 9,
      pleatDepth: 0.052,
      crownPeak: 0.18,
      crinkleAmp: 0.042,
      segU: 34,
      segV: 20,
    }),
    tissueFrontCrinkle: buildKoreanWrapSheetGeometry({
      topWidth: 1.54,
      bottomWidth: 0.42,
      height: 1.48,
      arcAngle: Math.PI * 1.12,
      baseRadius: 0.23,
      topRadius: 0.82,
      pleatCount: 8,
      pleatDepth: 0.044,
      crownPeak: -0.18,
      crinkleAmp: 0.038,
      segU: 30,
      segV: 18,
    }),

    ribbonCollar: new THREE.CylinderGeometry(0.275, 0.265, 0.16, 36, 1, true),
    bowUpperLeft: buildRibbonStripGeometry(bowUpperLeftPts, 0.082, 30),
    bowUpperRight: buildRibbonStripGeometry(bowUpperRightPts, 0.082, 30),
    bowLowerLeft: buildRibbonStripGeometry(bowLowerLeftPts, 0.088, 30),
    bowLowerRight: buildRibbonStripGeometry(bowLowerRightPts, 0.088, 30),
    ribbonTailLeft: buildRibbonStripGeometry(
      tailLeftPts,
      0.074,
      28,
      (t) => Math.sin(t * Math.PI) * 0.42,
      true
    ),
    ribbonTailRight: buildRibbonStripGeometry(
      tailRightPts,
      0.074,
      28,
      (t) => -Math.sin(t * Math.PI) * 0.38,
      true
    ),
    giftTagOval: buildOvalTagGeometry(),
    giftTagCord: new THREE.TubeGeometry(cordCurve, 20, 0.0045, 6, false),
    cutoutBloomCard: buildCurvedCutoutCardGeometry(0.08),
    cutoutShadowCard: new THREE.PlaneGeometry(1.12, 1.12, 1, 1),
  };

  return cachedGeometries;
}

/**
 * Draws the live custom gift note onto an offscreen canvas styled like a luxury
 * FLOWER rchii cream-and-champagne-gold oval cardstock tag.
 */
export function renderGiftTagCanvas(giftNote: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#FAF6EE';
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createRadialGradient(
    w * 0.5,
    h * 0.42,
    30,
    w * 0.5,
    h * 0.5,
    w * 0.75
  );
  grad.addColorStop(0, 'rgba(255, 253, 249, 0.85)');
  grad.addColorStop(1, 'rgba(232, 220, 198, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#C8B288';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w * 0.44, h * 0.455, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(200, 178, 136, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w * 0.41, h * 0.425, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#C8B288';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, 72, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#17271C';
  ctx.beginPath();
  ctx.arc(w / 2, 72, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#17271C';
  ctx.font = '600 32px Georgia, "Times New Roman", serif';
  ctx.fillText('FLOWER', w / 2 - 42, 165);

  ctx.font = 'italic 400 38px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#4F6D52';
  ctx.fillText('rchii', w / 2 + 64, 165);

  ctx.strokeStyle = '#C8B288';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 115, 192);
  ctx.lineTo(w / 2 - 14, 192);
  ctx.moveTo(w / 2 + 14, 192);
  ctx.lineTo(w / 2 + 115, 192);
  ctx.stroke();

  ctx.fillStyle = '#C8B288';
  ctx.beginPath();
  ctx.arc(w / 2, 192, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5E7262';
  ctx.font = '500 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('W H E R E   F L O W E R   I S   B L O O M', w / 2, 222);

  const displayNote =
    giftNote.trim() || 'Hand-tied with care at the FLOWER rchii Atelier.';

  ctx.fillStyle = '#17271C';
  ctx.font = 'italic 400 31px Georgia, "Times New Roman", serif';

  const words = displayNote.split(/\s+/).filter(Boolean);
  const maxWidth = 310;
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const visibleLines = lines.slice(0, 6);
  const lineHeight = 44;
  const startY = 395 - ((visibleLines.length - 1) * lineHeight) / 2;

  visibleLines.forEach((line, idx) => {
    ctx.fillText(line, w / 2, startY + idx * lineHeight);
  });

  ctx.strokeStyle = '#4F6D52';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 58, 608);
  ctx.quadraticCurveTo(w / 2, 622, w / 2 + 58, 600);
  ctx.stroke();

  const leafCoords = [
    [-34, 607, -0.5],
    [-12, 614, 0.45],
    [12, 612, -0.45],
    [34, 605, 0.5],
  ];
  ctx.fillStyle = 'rgba(79, 109, 82, 0.65)';
  for (const [lx, ly, rot] of leafCoords) {
    ctx.save();
    ctx.translate(w / 2 + lx, ly);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return canvas;
}
