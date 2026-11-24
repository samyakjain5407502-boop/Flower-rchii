'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  Camera,
  Download,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import {
  BLOOM_MAP,
  CAMERA_PRESETS,
  DEFAULT_AVAILABLE_ASSETS,
  getRibbonById,
  getWrapById,
  type AvailableOptionalAssets,
  type BouquetConfig,
  type CameraPresetId,
} from '@/lib/bouquet-data';
import { computePhyllotaxisLayout } from '@/lib/phyllotaxis';
import {
  BouquetWrapAndRibbon,
  CurvedStemBundle,
  HangingGiftTag,
  LushGreeneryBed,
  SpringStem,
} from './BouquetMeshes';
import {
  useFlowerCutouts,
  useWrapRibbonPhotos,
  type ProcessedCutout,
} from './flower-cutouts';

export interface BouquetCanvasHandle {
  captureSnapshot: () => string | null;
}

interface BouquetCanvasProps {
  config: BouquetConfig;
  cameraPreset: CameraPresetId;
  onCameraPresetChange: (preset: CameraPresetId) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  shuffleSeed: number;
  onShuffle: () => void;
  onDownloadCard: () => void;
  availableAssets?: AvailableOptionalAssets;
  isExportingCard?: boolean;
  compactControls?: boolean;
}

interface WebGLProbeResult {
  supported: boolean;
  software: boolean;
}

function probeWebGL(): WebGLProbeResult {
  if (typeof document === 'undefined') {
    return { supported: true, software: false };
  }
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return { supported: false, software: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = String(
      gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)
    );
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const software = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
      rendererStr
    );
    return { supported: true, software };
  } catch {
    return { supported: false, software: true };
  }
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Generates an in-memory procedural studio IBL environment map via RoomEnvironment.
 */
function ProceduralStudioEnvironment() {
  const gl = useThree((s) => s.gl);

  const envTarget = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const target = pmrem.fromScene(roomEnv, 0.04);
    roomEnv.dispose();
    pmrem.dispose();
    return target;
  }, [gl]);

  useEffect(() => {
    return () => {
      envTarget.dispose();
    };
  }, [envTarget]);

  return <primitive object={envTarget.texture} attach="environment" />;
}

/**
 * Exposes an imperative snapshot trigger bound to the live WebGLRenderer.
 */
function SnapshotBridge({
  onBind,
}: {
  onBind: (fn: () => string | null) => void;
}) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    onBind(() => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png', 0.96);
      } catch {
        return null;
      }
    });
  }, [gl, scene, camera, onBind]);

  return null;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();

/**
 * Constrained 2.5D Studio Camera Rig (limited azimuth/polar, no pan)
 * so thin flower sprite edges are never exposed.
 */
function CameraRig({
  presetId,
  presetTrigger,
  isSoftwareGl,
  onUserInteract,
}: {
  presetId: CameraPresetId;
  presetTrigger: number;
  isSoftwareGl: boolean;
  onUserInteract: () => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isTransitioning = useRef(false);
  const lastTrigger = useRef(-1);

  const activePreset = useMemo(
    () => CAMERA_PRESETS.find((p) => p.id === presetId) ?? CAMERA_PRESETS[0],
    [presetId]
  );

  useEffect(() => {
    if (lastTrigger.current !== presetTrigger) {
      lastTrigger.current = presetTrigger;
      isTransitioning.current = true;
    }
  }, [presetId, presetTrigger]);

  useFrame((state, rawDelta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(rawDelta, 0.05);
    const cam = state.camera;

    if (isTransitioning.current) {
      _camTargetPos.set(...activePreset.position);
      _camTargetLook.set(...activePreset.target);

      cam.position.set(
        THREE.MathUtils.damp(cam.position.x, _camTargetPos.x, 5.5, dt),
        THREE.MathUtils.damp(cam.position.y, _camTargetPos.y, 5.5, dt),
        THREE.MathUtils.damp(cam.position.z, _camTargetPos.z, 5.5, dt)
      );

      controls.target.set(
        THREE.MathUtils.damp(controls.target.x, _camTargetLook.x, 5.5, dt),
        THREE.MathUtils.damp(controls.target.y, _camTargetLook.y, 5.5, dt),
        THREE.MathUtils.damp(controls.target.z, _camTargetLook.z, 5.5, dt)
      );

      if (
        cam.position.distanceTo(_camTargetPos) < 0.025 &&
        controls.target.distanceTo(_camTargetLook) < 0.02
      ) {
        isTransitioning.current = false;
      }
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping={!isSoftwareGl}
      dampingFactor={0.07}
      minDistance={2.2}
      maxDistance={6.6}
      minAzimuthAngle={-0.38}
      maxAzimuthAngle={0.38}
      minPolarAngle={1.18}
      maxPolarAngle={1.68}
      target={[0, 0.15, 0]}
      onStart={() => {
        isTransitioning.current = false;
        onUserInteract();
      }}
    />
  );
}

function BouquetAssembly({
  config,
  autoRotate,
  shuffleSeed,
  availableAssets,
  cutouts,
  reducedMotion,
}: {
  config: BouquetConfig;
  autoRotate: boolean;
  shuffleSeed: number;
  availableAssets: AvailableOptionalAssets;
  cutouts: Record<string, ProcessedCutout> | null;
  reducedMotion: boolean;
}) {
  const bouquetRef = useRef<THREE.Group>(null);
  const wrapRibbonPhotos = useWrapRibbonPhotos(availableAssets);
  const placements = useMemo(
    () => computePhyllotaxisLayout(config.stems, shuffleSeed),
    [config.stems, shuffleSeed]
  );

  // Smooth mouse/touch 2.5D parallax tilt + optional graceful gallery sway within studio bounds
  useFrame((state, rawDelta) => {
    if (!bouquetRef.current) return;
    if (reducedMotion) {
      bouquetRef.current.position.y = 0;
      bouquetRef.current.rotation.set(0, 0, 0);
      return;
    }

    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.getElapsedTime();

    // Subtle organic breathing float
    bouquetRef.current.position.y = Math.sin(t * 0.9) * 0.015;

    const pointerTiltY = state.pointer.x * 0.085;
    const pointerTiltX = -state.pointer.y * 0.04;
    const swayY = autoRotate ? Math.sin(t * 0.65) * 0.24 : 0;

    const targetRotY = THREE.MathUtils.clamp(pointerTiltY + swayY, -0.32, 0.32);
    const targetRotX = THREE.MathUtils.clamp(pointerTiltX, -0.065, 0.065);

    bouquetRef.current.rotation.y = THREE.MathUtils.damp(
      bouquetRef.current.rotation.y,
      targetRotY,
      4.5,
      dt
    );
    bouquetRef.current.rotation.x = THREE.MathUtils.damp(
      bouquetRef.current.rotation.x,
      targetRotX,
      4.5,
      dt
    );
  });

  return (
    <group ref={bouquetRef} position={[0, 0, 0]}>
      <CurvedStemBundle placements={placements} />
      <BouquetWrapAndRibbon
        wrapId={config.wrapId}
        ribbonId={config.ribbonId}
        wrapPhoto={wrapRibbonPhotos.wraps[config.wrapId] ?? null}
        ribbonPhoto={wrapRibbonPhotos.ribbons[config.ribbonId] ?? null}
      />
      <HangingGiftTag giftNote={config.giftNote} reducedMotion={reducedMotion} />
      <LushGreeneryBed
        stemCount={placements.length}
        cutouts={cutouts as Record<keyof BouquetConfig['stems'], ProcessedCutout> | null}
      />
      {placements.map((placement) => (
        <SpringStem
          key={placement.key}
          placement={placement}
          cutout={cutouts?.[placement.bloomId]}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

/**
 * 2D Layered Composite Fallback when WebGL is unavailable or context is lost:
 * Uses the exact same fixed 36-slot layout, same cleaned flower PNGs,
 * #17271C CSS drop-shadow, back-row darkening, wrap & ribbon layers, and gift tag.
 */
function Bouquet2DFallback({
  config,
  shuffleSeed,
  cutouts,
  availableAssets,
  contextLost,
  onRestore,
}: {
  config: BouquetConfig;
  shuffleSeed: number;
  cutouts: Record<string, ProcessedCutout> | null;
  availableAssets: AvailableOptionalAssets;
  contextLost: boolean;
  onRestore?: () => void;
}) {
  const placements = useMemo(
    () => computePhyllotaxisLayout(config.stems, shuffleSeed),
    [config.stems, shuffleSeed]
  );
  const wrap = getWrapById(config.wrapId);
  const ribbon = getRibbonById(config.ribbonId);
  const hasWrapPhoto = availableAssets.wraps[config.wrapId];
  const hasRibbonPhoto = availableAssets.ribbons[config.ribbonId];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative w-[300px] sm:w-[360px] h-[390px] sm:h-[460px] flex items-center justify-center">
        {/* Back Korean wrap halo */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[20%] -translate-x-1/2 w-[74%] h-[54%] rounded-t-[48%] rounded-b-[28%] border border-[#C8B288]/40"
          style={{
            background: `linear-gradient(180deg, ${wrap.outerColor} 0%, ${wrap.innerColor} 100%)`,
            filter: 'drop-shadow(0 12px 24px rgba(23, 39, 28, 0.2))',
            zIndex: 1,
          }}
        />

        {/* Soft #17271C throat AO shadow */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[34%] -translate-x-1/2 w-[56%] h-[28%] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(23, 39, 28, 0.56) 0%, rgba(23, 39, 28, 0) 72%)',
            zIndex: 5,
          }}
        />

        {/* Fixed 36-slot layered flower sprites (same slot map & PNGs as 3D stage) */}
        {placements.map((p) => {
          const def = BLOOM_MAP[p.bloomId];
          const src = cutouts?.[p.bloomId]?.dataUrl || def.imagePath;
          const leftPct = 50 + p.headPosition[0] * 48;
          const topPct = 53 - p.headPosition[1] * 30;
          const sizePx = Math.round(def.spriteScale * p.scale * 138);
          const brightness = (1 - p.depthFactor * 0.14).toFixed(3);
          const rotDeg = Math.round((p.rotation * 180) / Math.PI);

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`2d-${p.key}`}
              src={src}
              alt={def.name}
              loading="lazy"
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                objectFit: 'contain',
                transform: `translate(-50%, -50%) rotate(${rotDeg}deg)`,
                zIndex: p.renderOrder,
                filter: `brightness(${brightness}) drop-shadow(0 7px 12px rgba(23, 39, 28, 0.38))`,
              }}
            />
          );
        })}

        {/* Lower stems emerging beneath wrap */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 bottom-[5%] -translate-x-1/2 w-8 h-16 rounded-b-full"
          style={{
            background: 'linear-gradient(180deg, #2E4932 0%, #4F6D52 100%)',
            zIndex: 2,
          }}
        />

        {/* Front wrap sitting IN FRONT of lower blooms & stems */}
        {hasWrapPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wrap.photoPath}
            alt={wrap.name}
            loading="lazy"
            className="absolute left-1/2 bottom-[6%] -translate-x-1/2 w-[82%] h-[62%] object-contain pointer-events-none"
            style={{
              zIndex: 110,
              filter: 'drop-shadow(0 12px 20px rgba(23, 39, 28, 0.26))',
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute left-1/2 bottom-[10%] -translate-x-1/2 w-[58%] h-[46%] border-t-2"
            style={{
              backgroundColor: wrap.outerColor,
              borderColor: wrap.edgeTrimColor,
              clipPath: 'polygon(6% 0%, 50% 18%, 94% 0%, 72% 100%, 28% 100%)',
              filter: 'drop-shadow(0 10px 18px rgba(23, 39, 28, 0.25))',
              zIndex: 110,
            }}
          />
        )}

        {/* Ribbon on top of wrap */}
        {hasRibbonPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ribbon.photoPath}
            alt={ribbon.name}
            loading="lazy"
            className="absolute left-1/2 bottom-[24%] -translate-x-1/2 w-[38%] h-[28%] object-contain pointer-events-none"
            style={{ zIndex: 120 }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute left-1/2 bottom-[32%] -translate-x-1/2 w-24 h-6 rounded-full border border-[#EDE0C9]/50"
            style={{
              backgroundColor: ribbon.color,
              boxShadow: '0 4px 10px rgba(23, 39, 28, 0.24)',
              zIndex: 120,
            }}
          />
        )}

        {/* Oval hanging gift tag attached to ribbon */}
        <div
          className="absolute right-[16%] bottom-[16%] w-16 h-20 rounded-full bg-[#FAF7F2] border border-[#C8B288] flex flex-col items-center justify-center px-1.5 text-center shadow-[0_6px_14px_rgba(23,39,28,0.18)]"
          style={{ zIndex: 130, transform: 'rotate(-8deg)' }}
        >
          <span className="font-serif text-[7px] tracking-[0.14em] text-[#17271C] font-semibold">
            FLOWER
          </span>
          <span className="font-serif italic text-[7px] text-[#4F6D52] line-clamp-2 leading-tight mt-0.5">
            {config.giftNote.trim() || 'With Love'}
          </span>
        </div>
      </div>

      {contextLost && onRestore && (
        <div className="absolute top-12 right-5 z-20">
          <button
            type="button"
            onClick={onRestore}
            className="px-4 py-2 rounded-full bg-[#17271C] text-[#EDE0C9] text-xs font-medium tracking-wide hover:bg-[#4F6D52] transition-colors shadow-[0_6px_18px_rgba(23,39,28,0.2)]"
          >
            Restore 3D Stage
          </button>
        </div>
      )}
    </div>
  );
}

export const BouquetCanvas = forwardRef<BouquetCanvasHandle, BouquetCanvasProps>(
  function BouquetCanvas(
    {
      config,
      cameraPreset,
      onCameraPresetChange,
      autoRotate,
      onToggleAutoRotate,
      shuffleSeed,
      onShuffle,
      onDownloadCard,
      availableAssets = DEFAULT_AVAILABLE_ASSETS,
      isExportingCard = false,
      compactControls = false,
    },
    ref
  ) {
    const [contextLost, setContextLost] = useState(false);
    const [presetTrigger, setPresetTrigger] = useState(0);
    const [webglProbe] = useState<WebGLProbeResult>(() => probeWebGL());
    const [reducedMotion] = useState<boolean>(() => detectReducedMotion());
    const cutouts = useFlowerCutouts();
    const snapshotFnRef = useRef<(() => string | null) | null>(null);

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        return snapshotFnRef.current ? snapshotFnRef.current() : null;
      },
    }));

    const handleSelectPreset = (id: CameraPresetId) => {
      onCameraPresetChange(id);
      setPresetTrigger((n) => n + 1);
    };

    const show2DFallback = !webglProbe.supported || contextLost;

    return (
      <div className="relative w-full h-full atelier-radial-stage overflow-hidden select-none">
        {/* Soft botanical vignette & subtle analog film grain over the stage (CSS only, no backdrop-filter) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] atelier-vignette"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] atelier-film-grain opacity-45"
        />

        {/* Thin champagne-gold editorial arch frame inside the 3D stage */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2.5 sm:inset-6 z-[4] rounded-t-[180px] sm:rounded-t-[260px] rounded-b-[22px] sm:rounded-b-[28px] border border-[#C8B288]/40"
        />

        {/* Quiet interaction caption */}
        <div className="pointer-events-none absolute top-3.5 left-4 sm:top-7 sm:left-8 z-10 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium tracking-wide text-[#4F6D52]">
          <span className="sm:hidden">3D Atelier</span>
          <span className="hidden sm:inline">Interactive Botanical Studio</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#17271C]/65">
            {show2DFallback ? (
              '2D Studio View'
            ) : (
              <>
                <span className="sm:hidden">Drag to spin</span>
                <span className="hidden sm:inline">Drag to tilt · Scroll to zoom</span>
              </>
            )}
          </span>
        </div>

        {/* WebGL 3D Canvas OR 2D Layered Composite Fallback */}
        {show2DFallback ? (
          <Bouquet2DFallback
            config={config}
            shuffleSeed={shuffleSeed}
            cutouts={cutouts}
            availableAssets={availableAssets}
            contextLost={contextLost}
            onRestore={contextLost ? () => setContextLost(false) : undefined}
          />
        ) : (
          <Canvas
            shadows={!webglProbe.software}
            dpr={webglProbe.software ? 1 : [1, 2]}
            camera={{ position: [0, 0.85, 5.1], fov: 36, near: 0.1, far: 40 }}
            gl={{
              antialias: !webglProbe.software,
              alpha: true,
              premultipliedAlpha: true,
              preserveDrawingBuffer: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.03,
            }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              const canvasEl = gl.domElement;
              const onLost = (e: Event) => {
                e.preventDefault();
                setContextLost(true);
              };
              const onRestored = () => setContextLost(false);
              canvasEl.addEventListener('webglcontextlost', onLost, false);
              canvasEl.addEventListener('webglcontextrestored', onRestored, false);
            }}
          >
            <ProceduralStudioEnvironment />

            {/* Warm ivory key light, mint rim light, champagne back-fill */}
            <hemisphereLight args={['#EBF1EC', '#EDE0C9', 0.92]} />
            <directionalLight
              position={[3.4, 6.2, 4.4]}
              intensity={1.52}
              color="#FAF7F2"
              castShadow={!webglProbe.software}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={1}
              shadow-camera-far={16}
              shadow-camera-left={-2.2}
              shadow-camera-right={2.2}
              shadow-camera-top={2.6}
              shadow-camera-bottom={-2.4}
              shadow-bias={-0.0004}
              shadow-normalBias={0.015}
            />
            <directionalLight
              position={[-4.0, 3.0, -3.2]}
              intensity={0.55}
              color="#EBF1EC"
            />
            <directionalLight
              position={[0.5, 2.2, -4.4]}
              intensity={0.5}
              color="#EDE0C9"
            />

            <BouquetAssembly
              config={config}
              autoRotate={autoRotate}
              shuffleSeed={shuffleSeed}
              availableAssets={availableAssets}
              cutouts={cutouts}
              reducedMotion={reducedMotion}
            />

            {/* Soft #17271C grounded contact shadow directly beneath the bouquet */}
            <ContactShadows
              position={[0, -1.78, 0]}
              opacity={0.34}
              scale={5.2}
              blur={2.4}
              far={3.5}
              color="#17271C"
              frames={webglProbe.software ? 1 : Infinity}
            />

            <CameraRig
              presetId={cameraPreset}
              presetTrigger={presetTrigger}
              isSoftwareGl={webglProbe.software}
              onUserInteract={() => {
                if (autoRotate) onToggleAutoRotate();
              }}
            />

            <SnapshotBridge
              onBind={(fn) => {
                snapshotFnRef.current = fn;
              }}
            />
          </Canvas>
        )}

        {/* Compact bottom studio dock (no backdrop-filter over WebGL) */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full bg-[#FAF7F2]/95 border border-[#C8B288]/55 shadow-[0_8px_28px_rgba(23,39,28,0.12)] max-w-[94%] overflow-x-auto no-scrollbar ${
            compactControls ? 'bottom-6 lg:bottom-7' : 'bottom-5 sm:bottom-7'
          }`}
        >
          {!show2DFallback && (
            <div className="flex items-center gap-0.5 sm:gap-1 pr-1 sm:pr-1.5 border-r border-[#A7C0A8]/50">
              <Camera className="w-3.5 h-3.5 text-[#4F6D52] ml-1 shrink-0 hidden sm:block" />
              {CAMERA_PRESETS.map((preset) => {
                const active = cameraPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-[#17271C] text-[#EDE0C9]'
                        : 'text-[#17271C]/75 hover:bg-[#EBF1EC] hover:text-[#17271C]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={onShuffle}
            title="Shuffle flower arrangement across fixed dome slots"
            aria-label="Shuffle blooms"
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium text-[#17271C]/80 hover:bg-[#EBF1EC] hover:text-[#17271C] whitespace-nowrap shrink-0 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5 shrink-0 text-[#4F6D52]" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>

          {!show2DFallback && (
            <>
              <button
                type="button"
                onClick={onToggleAutoRotate}
                title={autoRotate ? 'Pause studio sway' : 'Start gentle studio sway'}
                aria-label={autoRotate ? 'Pause studio sway' : 'Start gentle studio sway'}
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  autoRotate
                    ? 'bg-[#4F6D52] text-[#FAF7F2]'
                    : 'text-[#17271C]/75 hover:bg-[#EBF1EC] hover:text-[#17271C]'
                }`}
              >
                {autoRotate ? (
                  <Pause className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Play className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="hidden sm:inline">Studio Sway</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('front')}
                title="Reset camera angle"
                className="inline-flex items-center justify-center p-1.5 rounded-full text-[#17271C]/75 hover:bg-[#EBF1EC] hover:text-[#17271C] transition-colors shrink-0"
                aria-label="Reset camera view"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onDownloadCard}
                disabled={isExportingCard}
                aria-label="Save bouquet preview card"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#EBF1EC] text-[#17271C] hover:bg-[#A7C0A8]/50 text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5 shrink-0 text-[#4F6D52]" />
                <span className="hidden sm:inline">
                  {isExportingCard ? 'Saving…' : 'Save Card'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
);
