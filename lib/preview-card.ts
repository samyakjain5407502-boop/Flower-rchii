import {
  BLOOMS,
  formatINR,
  getBouquetPricing,
  getRibbonById,
  getWrapById,
  type BouquetConfig,
} from './bouquet-data';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const remaining = words.slice(i).join(' ');
        let clipped = remaining;
        while (clipped.length > 3 && ctx.measureText(`${clipped}…`).width > maxWidth) {
          clipped = clipped.slice(0, -1);
        }
        lines.push(clipped === remaining ? clipped : `${clipped}…`);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Composites a live WebGL bouquet snapshot onto a luxury FLOWER rchii editorial studio card
 * and downloads it as a PNG.
 */
export async function downloadBouquetPreviewCard(
  snapshotDataUrl: string,
  config: BouquetConfig
): Promise<void> {
  const width = 1080;
  const height = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Deep Forest Green luxury outer border + Warm Ivory editorial inner sheet
  ctx.fillStyle = '#17271C';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FAF7F2';
  drawRoundedRectPath(ctx, 36, 36, width - 72, height - 72, 28);
  ctx.fill();

  // Thin double Champagne Gold editorial frame
  ctx.strokeStyle = '#C8B288';
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, 56, 56, width - 112, height - 112, 20);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(200, 178, 136, 0.45)';
  ctx.lineWidth = 1;
  drawRoundedRectPath(ctx, 68, 68, width - 136, height - 136, 14);
  ctx.stroke();

  // 2. Top Brand Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#17271C';
  ctx.font = '500 44px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('F L O W E R   r c h i i', width / 2, 134);

  ctx.fillStyle = '#4F6D52';
  ctx.font = '500 15px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('W H E R E   F L O W E R   I S   B L O O M', width / 2, 168);

  // Subtle horizontal divider
  ctx.strokeStyle = 'rgba(200, 178, 136, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 140, 192);
  ctx.lineTo(width / 2 + 140, 192);
  ctx.stroke();

  // 3. Arch-framed 3D Bouquet Snapshot
  const imgX = 110;
  const imgY = 224;
  const imgW = width - 220;
  const imgH = 740;

  const grad = ctx.createRadialGradient(
    width / 2,
    imgY + imgH * 0.48,
    40,
    width / 2,
    imgY + imgH * 0.48,
    imgW * 0.65
  );
  grad.addColorStop(0, '#FAF7F2');
  grad.addColorStop(1, '#EBF1EC');

  ctx.save();
  drawRoundedRectPath(ctx, imgX, imgY, imgW, imgH, 240);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(imgW / img.width, imgH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(
        img,
        imgX + (imgW - drawW) / 2,
        imgY + (imgH - drawH) / 2,
        drawW,
        drawH
      );
      resolve();
    };
    img.onerror = () => resolve();
    img.src = snapshotDataUrl;
  });
  ctx.restore();

  // Thin Champagne Gold arch border around snapshot
  ctx.strokeStyle = '#C8B288';
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, imgX, imgY, imgW, imgH, 240);
  ctx.stroke();

  // 4. Bouquet Title & Recipe Metadata
  const pricing = getBouquetPricing(config);
  const wrap = getWrapById(config.wrapId);
  const ribbon = getRibbonById(config.ribbonId);
  const title = config.presetName || 'Bespoke Atelier Bouquet';

  ctx.fillStyle = '#17271C';
  ctx.font = '600 42px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(title, width / 2, 1028);

  ctx.fillStyle = '#4F6D52';
  ctx.font = '500 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    `${wrap.name}  ·  ${ribbon.name}  ·  ${pricing.totalStems} Stems  ·  ${formatINR(pricing.grandTotal)}`,
    width / 2,
    1064
  );

  // Stem list line
  const stemSummary = BLOOMS.filter((b) => (config.stems[b.id] || 0) > 0)
    .map((b) => `${config.stems[b.id]} ${b.name}`)
    .join('  ·  ');

  ctx.fillStyle = '#5B6A5F';
  ctx.font = '400 16px "Plus Jakarta Sans", system-ui, sans-serif';
  const recipeLines = wrapCanvasText(ctx, stemSummary || 'Custom Floral Selection', width - 220, 2);
  recipeLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, 1102 + idx * 24);
  });

  // 5. Personal Gift Note Card Block
  const noteBoxY = 1158;
  ctx.fillStyle = '#F3EFE6';
  drawRoundedRectPath(ctx, 140, noteBoxY, width - 280, 152, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 178, 136, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#8C7853';
  ctx.font = '500 13px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('PERSONAL GIFT TAG', width / 2, noteBoxY + 34);

  const noteText =
    config.giftNote.trim() || 'Hand-tied with care at the FLOWER rchii Atelier.';
  ctx.fillStyle = '#17271C';
  ctx.font = 'italic 400 30px "Cormorant Garamond", Georgia, serif';
  const noteLines = wrapCanvasText(ctx, `“${noteText}”`, width - 360, 2);
  noteLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, noteBoxY + 82 + idx * 38);
  });

  // Footer caption
  ctx.fillStyle = '#7E8F81';
  ctx.font = '400 14px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Sculpted in The 3D Atelier · FLOWER rchii', width / 2, 1352);

  // Trigger download
  const link = document.createElement('a');
  const safeSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.download = `flower-rchii-${safeSlug}.png`;
  link.href = canvas.toDataURL('image/png', 0.96);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
