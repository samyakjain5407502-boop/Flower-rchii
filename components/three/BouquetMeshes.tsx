'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BLOOM_MAP,
  getRibbonById,
  getWrapById,
  type BloomId,
  type RibbonId,
  type WrapId,
} from '@/lib/bouquet-data';
import type { StemPlacement } from '@/lib/phyllotaxis';
import {
  getFloralGeometries,
  getFloralTextures,
  renderGiftTagCanvas,
} from './floral-geometries';
import type { ProcessedCutout } from './flower-cutouts';

const _stemUp = new THREE.Vector3(0, 1, 0);
const _stemMid = new THREE.Vector3();
const _stemQuat = new THREE.Quaternion();
const _worldPos = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _outwardDir = new THREE.Vector3();
const _blendNormal = new THREE.Vector3();
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _rollQuat = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);

/**
 * Soft radial ambient-occlusion core inside the bouquet throat in Deep Botanical Forest Green (#17271C, never pure black).
 */
function buildCoreBowlAoTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.06,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    grad.addColorStop(0.0, 'rgba(23, 39, 28, 0.86)');
    grad.addColorStop(0.52, 'rgba(23, 39, 28, 0.52)');
    grad.addColorStop(1.0, 'rgba(23, 39, 28, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.needsUpdate = true;
  return tex;
}

let cachedAoTex: THREE.CanvasTexture | null = null;
function getCoreBowlAoTexture(): THREE.CanvasTexture {
  if (!cachedAoTex) cachedAoTex = buildCoreBowlAoTexture();
  return cachedAoTex;
}

const cachedWrapTextures = new Map<string, THREE.CanvasTexture>();

/**
 * Generates a high-resolution studio-shaded Korean florist cotton-rag paper texture
 * with soft organic fold shading, subtle linen grain, delicate champagne-gold lip piping,
 * and a soft #17271C contact shadow along the upper crease where blooms tuck into the paper.
 */
function getPleatedWrapTexture(
  outerHex: string,
  innerHex: string,
  trimHex: string
): THREE.CanvasTexture {
  const key = `${outerHex}|${innerHex}|${trimHex}`;
  const existing = cachedWrapTextures.get(key);
  if (existing) return existing;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Base matte paper gradient (slightly warmer/lit toward upper edge, deeper toward waist gather)
    const baseGrad = ctx.createLinearGradient(0, 0, size * 0.25, size);
    baseGrad.addColorStop(0, innerHex);
    baseGrad.addColorStop(0.28, outerHex);
    baseGrad.addColorStop(1, outerHex);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Soft organic radial pleat folds converging toward the cinched waist
    for (let i = 0; i < 9; i++) {
      const xTop = (i / 8) * size;
      const xBot = size * 0.5 + (xTop - size * 0.5) * 0.28;
      const foldGrad = ctx.createLinearGradient(xTop - 36, 0, xTop + 36, 0);
      foldGrad.addColorStop(0, 'rgba(23, 39, 28, 0)');
      foldGrad.addColorStop(0.45, 'rgba(23, 39, 28, 0.14)');
      foldGrad.addColorStop(0.62, 'rgba(250, 247, 242, 0.08)');
      foldGrad.addColorStop(1, 'rgba(23, 39, 28, 0)');
      ctx.fillStyle = foldGrad;
      ctx.beginPath();
      ctx.moveTo(xTop - 34, 0);
      ctx.lineTo(xTop + 34, 0);
      ctx.lineTo(xBot + 16, size);
      ctx.lineTo(xBot - 16, size);
      ctx.closePath();
      ctx.fill();
    }

    // Soft botanical depth shadow near the cinched lower waist & deep inner pocket
    const waistShadow = ctx.createLinearGradient(0, size * 0.65, 0, size);
    waistShadow.addColorStop(0, 'rgba(23, 39, 28, 0)');
    waistShadow.addColorStop(1, 'rgba(23, 39, 28, 0.28)');
    ctx.fillStyle = waistShadow;
    ctx.fillRect(0, size * 0.65, size, size * 0.35);

    // Delicate matte cotton-rag fiber grain (never pure black or pure white)
    for (let i = 0; i < 1200; i++) {
      const gx = (((Math.sin(i * 73.1) * 19381.4) % 1) + 1) % 1;
      const gy = (((Math.sin(i * 41.7) * 31942.8) % 1) + 1) % 1;
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(250, 247, 242, 0.045)' : 'rgba(23, 39, 28, 0.05)';
      ctx.fillRect(gx * size, gy * size, 3, 1);
    }

    // Refined thin Korean luxury florist double-line edge piping along the upper lip
    ctx.fillStyle = trimHex;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(0, 6, size, 4);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 14, size, 2);
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cachedWrapTextures.set(key, tex);
  return tex;
}

const cachedRibbonTextures = new Map<string, THREE.CanvasTexture>();

/**
 * Generates a woven double-faced silk satin ribbon texture with stitched selvedge edges
 * and soft lustrous sheen bands.
 */
function getSilkRibbonTexture(colorHex: string): THREE.CanvasTexture {
  const existing = cachedRibbonTextures.get(colorHex);
  if (existing) return existing;

  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, w, h);

    // Lustrous silk highlight sheen along center of ribbon
    const sheenGrad = ctx.createLinearGradient(0, 0, 0, h);
    sheenGrad.addColorStop(0, 'rgba(23, 39, 28, 0.2)');
    sheenGrad.addColorStop(0.24, 'rgba(250, 247, 242, 0.14)');
    sheenGrad.addColorStop(0.5, 'rgba(237, 224, 201, 0.22)');
    sheenGrad.addColorStop(0.76, 'rgba(250, 247, 242, 0.1)');
    sheenGrad.addColorStop(1, 'rgba(23, 39, 28, 0.22)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, 0, w, h);

    // Fine grosgrain weave lines
    ctx.fillStyle = 'rgba(23, 39, 28, 0.06)';
    for (let x = 0; x < w; x += 4) {
      ctx.fillRect(x, 0, 1, h);
    }

    // Subtle stitched selvedge borders
    ctx.fillStyle = 'rgba(237, 224, 201, 0.35)';
    ctx.fillRect(0, 5, w, 2);
    ctx.fillRect(0, h - 7, w, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.needsUpdate = true;
  cachedRibbonTextures.set(colorHex, tex);
  return tex;
}

/**
 * Dense botanical throat cushion & ambient occlusion core sitting strictly behind focal blooms
 * (renderOrder 4–10) so the bouquet throat has authentic depth and zero hollow gaps.
 */
export function LushGreeneryBed({
  stemCount,
  cutouts,
}: {
  stemCount: number;
  cutouts: Record<BloomId, ProcessedCutout> | null;
}) {
  const geo = useMemo(() => getFloralGeometries(), []);
  const coreAoTex = useMemo(() => getCoreBowlAoTexture(), []);

  const layout = useMemo(() => {
    const scaleFactor = Math.min(1.12, 0.86 + Math.sqrt(Math.max(1, stemCount)) * 0.06);

    // 10 subtle deep-back Eucalyptus sprigs framing the outer perimeter behind all focal blooms
    const eucFronds: {
      pos: [number, number, number];
      rot: [number, number, number];
      scale: number;
      flipX: number;
    }[] = [];

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.24;
      const r = (0.54 + (i % 2) * 0.12) * scaleFactor;
      const y = 0.56 + (i % 3) * 0.14;
      eucFronds.push({
        pos: [Math.cos(a) * r, y, -0.22 - (i % 2) * 0.06],
        rot: [-0.08, 0, (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.08)],
        scale: (0.78 + (i % 3) * 0.06) * scaleFactor,
        flipX: i % 2 === 0 ? 1 : -1,
      });
    }

    return { eucFronds, scaleFactor };
  }, [stemCount]);

  if (stemCount <= 0) return null;

  const eucCutout = cutouts?.eucalyptus;

  return (
    <group>
      {/* Subtle warm ivory bounce light nestled inside the bouquet dome */}
      <pointLight
        position={[0, 0.88, 0.24]}
        intensity={0.48}
        distance={2.8}
        decay={2}
        color="#EDE0C9"
      />

      {/* Dark soft Ambient Occlusion core inside the bouquet throat (#17271C, never pure black) */}
      <mesh
        position={[0, 0.36, -0.06]}
        scale={[0.58 * layout.scaleFactor, 0.26, 0.42 * layout.scaleFactor]}
        receiveShadow
        renderOrder={4}
      >
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#17271C" roughness={0.95} />
      </mesh>
      <mesh
        position={[0, 0.64, -0.14]}
        scale={[1.48 * layout.scaleFactor, 1.18 * layout.scaleFactor, 1]}
        renderOrder={5}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={coreAoTex}
          transparent
          premultipliedAlpha
          opacity={0.64}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Deep-back studio Eucalyptus collar framing the bouquet behind focal blooms */}
      {eucCutout &&
        layout.eucFronds.map((frond, idx) => (
          <group
            key={`euc-throat-${idx}`}
            position={frond.pos}
            rotation={frond.rot}
            scale={[frond.scale * frond.flipX, frond.scale, 1]}
          >
            <mesh geometry={geo.cutoutBloomCard} renderOrder={7 + (idx % 3)}>
              <meshStandardMaterial
                color="#D2DCD3"
                map={eucCutout.texture}
                transparent
                premultipliedAlpha
                alphaTest={0.04}
                depthWrite={false}
                roughness={0.86}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
    </group>
  );
}

/**
 * Curved stem bundle converging cleanly at a single waist tie point ([0, -0.78, 0]),
 * with natural organic curvature, visible ONLY beneath the wrap skirt.
 */
export function CurvedStemBundle({ placements }: { placements: StemPlacement[] }) {
  const stemGeometries = useMemo(() => {
    return placements.map((p) => {
      // Upper hidden anchor inside wrap throat -> single tie convergence point -> cut bottom end beneath wrap
      const start = new THREE.Vector3(
        p.headPosition[0] * 0.24,
        -0.46,
        p.headPosition[2] * 0.16
      );
      const tie = new THREE.Vector3(...p.stemTiePoint);
      const end = new THREE.Vector3(...p.stemBottom);
      const curve = new THREE.CatmullRomCurve3([start, tie, end]);
      return {
        key: p.key,
        geometry: new THREE.TubeGeometry(curve, 10, 0.0155, 6, false),
        color: p.bloomId === 'eucalyptus' ? '#4F6D52' : '#2E4932',
      };
    });
  }, [placements]);

  useEffect(() => {
    return () => {
      stemGeometries.forEach((s) => s.geometry.dispose());
    };
  }, [stemGeometries]);

  if (placements.length === 0) return null;

  return (
    <group>
      {stemGeometries.map((stem) => (
        <mesh
          key={`stem-tube-${stem.key}`}
          geometry={stem.geometry}
          renderOrder={2}
          castShadow
        >
          <meshStandardMaterial color={stem.color} roughness={0.88} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Photorealistic 3D-Layered Botanical Cutout Sprite:
 * - Short spring pop-in (scale 0.6 -> 1.0, slight upward drift), respecting prefers-reduced-motion.
 * - Soft #17271C contact shadow directly behind each sprite (0.36–0.44 opacity).
 * - Back-row darkening (~12–15% darker via depthFactor) for genuine studio depth.
 * - Camera-facing billboarding with gentle parallax so thin edges are never exposed.
 * - Premultiplied alpha + strict back-to-front renderOrder to eliminate transparency sorting artifacts.
 */
export function SpringStem({
  placement,
  cutout,
  reducedMotion,
}: {
  placement: StemPlacement;
  cutout: ProcessedCutout | undefined;
  reducedMotion: boolean;
}) {
  const geo = useMemo(() => getFloralGeometries(), []);
  const headGroupRef = useRef<THREE.Group>(null);
  const currentScale = useRef(reducedMotion ? placement.scale : placement.scale * 0.6);
  const initialized = useRef(false);

  const bloomDef = BLOOM_MAP[placement.bloomId];
  const isAiry = placement.bloomId === 'babys-breath';
  const isFoliage = placement.bloomId === 'eucalyptus';

  // Camera-facing billboard blend keeps sprites face-on with slight natural parallax
  const billboardBlend = isFoliage ? 0.84 : isAiry ? 0.88 : 0.91;

  // Contact shadow opacity strictly within 0.35–0.45 for focal blooms (lighter for airy filler)
  const shadowOpacity = isAiry ? 0.26 : isFoliage ? 0.36 : 0.42;

  const flipSign = useMemo(
    () => (Math.sin(placement.seed * 7.7) > 0 ? 1 : -1),
    [placement.seed]
  );

  // Back-row sprites are 12–15% darker than front-row sprites + subtle organic warm variation
  const depthTintColor = useMemo(() => {
    const baseShade = 1 - placement.depthFactor * 0.145;
    const microVar = Math.sin(placement.seed * 11.3) * 0.025;
    const mul = Math.max(0.82, Math.min(1.0, baseShade + microVar));
    // Multiply against Warm Ivory (#FAF7F2) so highlights never clip to pure white
    return new THREE.Color(
      (250 / 255) * mul,
      (247 / 255) * mul,
      (242 / 255) * mul
    );
  }, [placement.depthFactor, placement.seed]);

  const curHead = useRef(
    new THREE.Vector3(
      placement.headPosition[0],
      reducedMotion ? placement.headPosition[1] : placement.headPosition[1] - 0.14,
      placement.headPosition[2]
    )
  );

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const targetX = placement.headPosition[0];
    const targetY = placement.headPosition[1];
    const targetZ = placement.headPosition[2];

    if (!initialized.current) {
      curHead.current.set(
        targetX,
        reducedMotion ? targetY : targetY - 0.14,
        targetZ
      );
      currentScale.current = reducedMotion ? placement.scale : placement.scale * 0.6;
      initialized.current = true;
    }

    if (reducedMotion) {
      curHead.current.set(targetX, targetY, targetZ);
      currentScale.current = placement.scale;
    } else {
      curHead.current.x = THREE.MathUtils.damp(curHead.current.x, targetX, 9.0, dt);
      curHead.current.y = THREE.MathUtils.damp(curHead.current.y, targetY, 9.0, dt);
      curHead.current.z = THREE.MathUtils.damp(curHead.current.z, targetZ, 9.0, dt);
      currentScale.current = THREE.MathUtils.damp(
        currentScale.current,
        placement.scale,
        10.5,
        dt
      );
    }

    if (headGroupRef.current) {
      headGroupRef.current.position.copy(curHead.current);
      headGroupRef.current.scale.setScalar(currentScale.current);

      headGroupRef.current.getWorldPosition(_worldPos);
      _toCam.subVectors(state.camera.position, _worldPos).normalize();

      // Outward dome normal scaled by slot tilt (10°–40°) blended heavily toward camera for clean 2.5D parallax
      const tiltInfluence = 0.45 + (placement.tiltRad / 0.7) * 0.65;
      _outwardDir
        .set(
          curHead.current.x * tiltInfluence,
          Math.max(0.32, curHead.current.y - 0.18),
          Math.max(0.25, curHead.current.z + 0.55)
        )
        .normalize();

      _blendNormal
        .copy(_outwardDir)
        .lerp(_toCam, billboardBlend)
        .normalize();

      const parent = headGroupRef.current.parent;
      if (parent) {
        parent.updateMatrixWorld();
        const invParentQuat = _stemQuat.copy(parent.quaternion).invert();
        _blendNormal.applyQuaternion(invParentQuat).normalize();
      }

      _lookMat.lookAt(_blendNormal, _stemMid.set(0, 0, 0), _stemUp);
      _targetQuat.setFromRotationMatrix(_lookMat);
      _rollQuat.setFromAxisAngle(_zAxis, placement.rotation);
      _targetQuat.multiply(_rollQuat);

      if (reducedMotion) {
        headGroupRef.current.quaternion.copy(_targetQuat);
      } else {
        headGroupRef.current.quaternion.slerp(_targetQuat, Math.min(1, dt * 16));
      }
    }
  });

  // Square-normalized sprite multiplied by per-flower spriteScale from config
  const spriteSize = bloomDef.spriteScale;
  const spriteWidth = spriteSize * flipSign;

  return (
    <group ref={headGroupRef}>
      {cutout && (
        <>
          {/* Soft #17271C contact shadow directly behind each bloom sprite */}
          <mesh
            geometry={geo.cutoutShadowCard}
            position={[0.015, -0.028, -0.032]}
            scale={[spriteSize * 1.07, spriteSize * 1.07, 1]}
            renderOrder={placement.renderOrder - 1}
          >
            <meshBasicMaterial
              map={cutout.shadowTexture}
              color="#17271C"
              transparent
              premultipliedAlpha
              opacity={shadowOpacity}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Normalized, premultiplied studio-photographed flower sprite */}
          <mesh
            geometry={geo.cutoutBloomCard}
            scale={[spriteWidth, spriteSize, 1]}
            renderOrder={placement.renderOrder}
          >
            <meshStandardMaterial
              color={depthTintColor}
              map={cutout.texture}
              transparent
              premultipliedAlpha
              alphaTest={0.04}
              depthWrite={false}
              roughness={0.86}
              metalness={0}
              emissive={depthTintColor}
              emissiveMap={cutout.texture}
              emissiveIntensity={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

/**
 * Korean-Style Luxury Wrapping & Silk Ribbon:
 * - Uses real-photo transparent PNGs (/public/wraps/wrap-*.png & /public/ribbons/ribbon-*.png) when present.
 * - Falls back seamlessly to matte procedural 5-sheet Korean wrapping (roughness 0.92) & 4-loop silk ribbon bow.
 * - Back halo sheets sit behind blooms (renderOrder 1); front wrap sits IN FRONT of the lower half of blooms
 *   and stems (renderOrder 110); ribbon sits on top (renderOrder 120).
 */
export function BouquetWrapAndRibbon({
  wrapId,
  ribbonId,
  wrapPhoto,
  ribbonPhoto,
}: {
  wrapId: WrapId;
  ribbonId: RibbonId;
  wrapPhoto?: THREE.Texture | null;
  ribbonPhoto?: THREE.Texture | null;
}) {
  const geo = useMemo(() => getFloralGeometries(), []);
  const tex = useMemo(() => getFloralTextures(), []);
  const wrap = getWrapById(wrapId);
  const ribbon = getRibbonById(ribbonId);

  const wrapPaperColorTex = useMemo(
    () => getPleatedWrapTexture(wrap.outerColor, wrap.innerColor, wrap.edgeTrimColor),
    [wrap.outerColor, wrap.innerColor, wrap.edgeTrimColor]
  );

  const silkRibbonColorTex = useMemo(
    () => getSilkRibbonTexture(ribbon.color),
    [ribbon.color]
  );

  const outerWrapMaterialProps = useMemo(
    () => ({
      color: '#FAF7F2',
      map: wrapPaperColorTex,
      roughness: 0.92,
      metalness: 0.0,
      bumpMap: tex.wrapPaperBump,
      bumpScale: 0.026,
      sheen: 0.22,
      sheenRoughness: 0.86,
      sheenColor: wrap.innerColor,
      side: THREE.DoubleSide,
    }),
    [wrap.innerColor, wrapPaperColorTex, tex.wrapPaperBump]
  );

  const innerTissueMaterialProps = useMemo(
    () => ({
      color: '#FAF7F2',
      roughness: 0.9,
      metalness: 0.0,
      bumpMap: tex.tissueCrinkleBump,
      bumpScale: 0.036,
      sheen: 0.35,
      sheenRoughness: 0.78,
      sheenColor: '#EDE0C9',
      side: THREE.DoubleSide,
    }),
    [tex.tissueCrinkleBump]
  );

  const ribbonMaterialProps = useMemo(
    () => ({
      color: '#FAF7F2',
      map: silkRibbonColorTex,
      roughness: ribbon.roughness,
      metalness: ribbon.metalness,
      sheen: ribbon.sheen,
      sheenRoughness: 0.28,
      sheenColor: '#EDE0C9',
      transparent: ribbon.opacity < 0.99,
      opacity: ribbon.opacity,
      side: THREE.DoubleSide,
    }),
    [ribbon, silkRibbonColorTex]
  );

  return (
    <group position={[0, -0.78, 0]}>
      {/* === LAYER A: BACK WRAP HALO & TISSUE LINER (BEHIND BLOOMS, renderOrder 1–3) === */}
      <mesh
        geometry={geo.koreanHaloCenter}
        position={[0, -0.02, -0.26]}
        rotation={[-0.12, Math.PI, 0]}
        castShadow
        receiveShadow
        renderOrder={1}
      >
        <meshPhysicalMaterial {...outerWrapMaterialProps} />
      </mesh>
      <mesh
        geometry={geo.koreanHaloWing}
        position={[-0.1, -0.01, -0.2]}
        rotation={[-0.1, Math.PI + 0.56, 0.14]}
        castShadow
        receiveShadow
        renderOrder={1}
      >
        <meshPhysicalMaterial {...outerWrapMaterialProps} />
      </mesh>
      <mesh
        geometry={geo.koreanHaloWing}
        position={[0.1, -0.01, -0.2]}
        rotation={[-0.1, Math.PI - 0.56, -0.14]}
        castShadow
        receiveShadow
        renderOrder={1}
      >
        <meshPhysicalMaterial {...outerWrapMaterialProps} />
      </mesh>

      {/* Crisp crinkled Warm Ivory (#FAF7F2) inner tissue liner peeking behind blooms */}
      <mesh
        geometry={geo.tissueBackCrinkle}
        position={[0, 0.08, -0.16]}
        rotation={[-0.08, Math.PI, 0]}
        castShadow
        receiveShadow
        renderOrder={3}
      >
        <meshPhysicalMaterial {...innerTissueMaterialProps} />
      </mesh>

      {/* === LAYER B: FRONT WRAP (SITS IN FRONT OF LOWER BLOOMS & STEMS, renderOrder 110) === */}
      {wrapPhoto ? (
        <mesh position={[0, 0.42, 0.48]} renderOrder={110}>
          <planeGeometry args={[2.15, 2.55]} />
          <meshStandardMaterial
            map={wrapPhoto}
            transparent
            premultipliedAlpha
            alphaTest={0.04}
            roughness={0.9}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <>
          <mesh
            geometry={geo.tissueFrontCrinkle}
            position={[0, 0.04, 0.14]}
            rotation={[0.08, 0.08, 0]}
            castShadow
            receiveShadow
            renderOrder={108}
          >
            <meshPhysicalMaterial {...innerTissueMaterialProps} />
          </mesh>

          <mesh
            geometry={geo.koreanSideFold}
            position={[-0.08, -0.04, 0.14]}
            rotation={[0.05, -Math.PI * 0.54, 0.12]}
            castShadow
            receiveShadow
            renderOrder={109}
          >
            <meshPhysicalMaterial {...outerWrapMaterialProps} />
          </mesh>
          <mesh
            geometry={geo.koreanSideFold}
            position={[0.08, -0.04, 0.14]}
            rotation={[0.05, Math.PI * 0.54, -0.12]}
            castShadow
            receiveShadow
            renderOrder={109}
          >
            <meshPhysicalMaterial {...outerWrapMaterialProps} />
          </mesh>

          <mesh
            geometry={geo.koreanFrontVFold}
            position={[0, -0.02, 0.2]}
            rotation={[0.14, 0, 0]}
            castShadow
            receiveShadow
            renderOrder={110}
          >
            <meshPhysicalMaterial {...outerWrapMaterialProps} />
          </mesh>

          <mesh
            geometry={geo.lowerPleatedSkirt}
            position={[0, 0.04, 0.02]}
            rotation={[Math.PI, 0, 0]}
            castShadow
            receiveShadow
            renderOrder={110}
          >
            <meshPhysicalMaterial {...outerWrapMaterialProps} />
          </mesh>

          {/* Champagne-gold hem accent */}
          <mesh position={[0, -0.92, 0.02]} rotation={[Math.PI / 2, 0, 0]} renderOrder={111}>
            <torusGeometry args={[0.53, 0.007, 8, 48]} />
            <meshStandardMaterial
              color={wrap.edgeTrimColor}
              roughness={0.38}
              metalness={0.58}
            />
          </mesh>
        </>
      )}

      {/* === LAYER C: RIBBON ON TOP OF WRAP (renderOrder 120) === */}
      {ribbonPhoto ? (
        <mesh position={[0, 0.04, 0.56]} renderOrder={120}>
          <planeGeometry args={[1.05, 1.05]} />
          <meshStandardMaterial
            map={ribbonPhoto}
            transparent
            premultipliedAlpha
            alphaTest={0.04}
            roughness={0.42}
            metalness={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <group position={[0, 0.02, 0.04]}>
          <mesh geometry={geo.ribbonCollar} castShadow receiveShadow renderOrder={119}>
            <meshPhysicalMaterial {...ribbonMaterialProps} />
          </mesh>

          <group position={[0, 0, 0.28]}>
            <mesh scale={[1.2, 0.92, 0.85]} castShadow receiveShadow renderOrder={120}>
              <sphereGeometry args={[0.068, 16, 12]} />
              <meshPhysicalMaterial {...ribbonMaterialProps} />
            </mesh>

            <mesh geometry={geo.bowUpperLeft} castShadow receiveShadow renderOrder={120}>
              <meshPhysicalMaterial {...ribbonMaterialProps} />
            </mesh>
            <mesh geometry={geo.bowUpperRight} castShadow receiveShadow renderOrder={120}>
              <meshPhysicalMaterial {...ribbonMaterialProps} />
            </mesh>
            <mesh geometry={geo.bowLowerLeft} castShadow receiveShadow renderOrder={120}>
              <meshPhysicalMaterial {...ribbonMaterialProps} />
            </mesh>
            <mesh geometry={geo.bowLowerRight} castShadow receiveShadow renderOrder={120}>
              <meshPhysicalMaterial {...ribbonMaterialProps} />
            </mesh>
            <mesh geometry={geo.ribbonTailLeft} castShadow receiveShadow renderOrder={120}>
              <meshPhysicalMaterial {...ribbonMaterialProps} />
            </mesh>
            <mesh geometry={geo.ribbonTailRight} castShadow receiveShadow renderOrder={120}>
              <meshPhysicalMaterial {...ribbonMaterialProps} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}

/**
 * 3D Hanging Cream-and-Gold Oval Cardstock Tag tied to the bouquet ribbon knot (renderOrder 130).
 */
export function HangingGiftTag({
  giftNote,
  reducedMotion,
}: {
  giftNote: string;
  reducedMotion: boolean;
}) {
  const geo = useMemo(() => getFloralGeometries(), []);
  const tagPivotRef = useRef<THREE.Group>(null);

  const texture = useMemo(() => {
    const canvas = renderGiftTagCanvas(giftNote);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, [giftNote]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }) => {
    if (!tagPivotRef.current) return;
    if (reducedMotion) {
      tagPivotRef.current.rotation.z = -0.14;
      tagPivotRef.current.rotation.y = 0.24;
      return;
    }
    const t = clock.getElapsedTime();
    tagPivotRef.current.rotation.z = -0.14 + Math.sin(t * 1.15) * 0.022;
    tagPivotRef.current.rotation.y = 0.24 + Math.cos(t * 0.85) * 0.03;
  });

  return (
    <group position={[0.02, -0.76, 0.36]}>
      <mesh geometry={geo.giftTagCord} renderOrder={128}>
        <meshStandardMaterial color="#C8B288" roughness={0.35} metalness={0.55} />
      </mesh>

      <group ref={tagPivotRef} position={[0.37, -0.45, 0.16]}>
        <mesh position={[0, 0.24, 0]} renderOrder={129}>
          <torusGeometry args={[0.017, 0.004, 8, 20]} />
          <meshStandardMaterial
            color="#C8B288"
            roughness={0.25}
            metalness={0.85}
          />
        </mesh>

        <mesh
          geometry={geo.giftTagOval}
          position={[0, -0.02, 0]}
          castShadow
          receiveShadow
          renderOrder={130}
        >
          <meshStandardMaterial
            map={texture}
            roughness={0.78}
            metalness={0.02}
          />
        </mesh>
      </group>
    </group>
  );
}
