import fs from 'node:fs';
import path from 'node:path';
import { AtelierExperience } from '@/components/AtelierExperience';
import {
  RIBBON_OPTIONS,
  SIGNATURE_PRESETS,
  WRAP_OPTIONS,
  type AvailableOptionalAssets,
  type RibbonId,
  type WrapId,
} from '@/lib/bouquet-data';

function checkPublicAsset(publicRelativePath: string): boolean {
  try {
    const fullPath = path.join(
      process.cwd(),
      'public',
      publicRelativePath.replace(/^\/+/, '')
    );
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
}

function detectOptionalAssets(): AvailableOptionalAssets {
  const wraps = {} as Record<WrapId, boolean>;
  for (const w of WRAP_OPTIONS) {
    wraps[w.id] = checkPublicAsset(w.photoPath);
  }

  const ribbons = {} as Record<RibbonId, boolean>;
  for (const r of RIBBON_OPTIONS) {
    ribbons[r.id] = checkPublicAsset(r.photoPath);
  }

  const bouquets: Record<string, boolean> = {};
  for (const preset of SIGNATURE_PRESETS) {
    bouquets[preset.id] = checkPublicAsset(preset.photoPath);
  }

  const heroBloomFrames =
    checkPublicAsset('/hero/bloom-001.webp') &&
    checkPublicAsset('/hero/bloom-036.webp');

  const storyPhotos = {
    choose: checkPublicAsset('/story/choose.jpg'),
    arrange: checkPublicAsset('/story/arrange.jpg'),
    gift: checkPublicAsset('/story/gift.jpg'),
  };

  return {
    wraps,
    ribbons,
    bouquets,
    heroBloomFrames,
    storyPhotos,
  };
}

export default function HomePage() {
  const availableAssets = detectOptionalAssets();
  return <AtelierExperience availableAssets={availableAssets} />;
}
