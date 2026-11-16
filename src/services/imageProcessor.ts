import {
  CompressionSettings,
  CropRect,
  ProcessedFileResult,
  QualityStatus,
  QueuedFileItem,
} from '../types/processor';
import { calculateReductionPercent, sanitizeSvgContent } from '../utils/formatters';
import { computeFaceSafeCrop } from './faceDetector';
import type { WorkerCompressRequest, WorkerCompressResponse } from '../workers/compressionWorker';

let sharedWorker: Worker | null = null;

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('../workers/compressionWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return sharedWorker;
}

export async function inspectImageMetadata(
  file: File,
  previewUrl: string
): Promise<{ width: number; height: number; hasTransparency: boolean }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image'));
    el.src = previewUrl;
  });

  const width = img.naturalWidth || 1;
  const height = img.naturalHeight || 1;

  // Quick alpha check on downsampled canvas for PNG/WEBP/GIF/SVG
  let hasTransparency = false;
  const ext = file.name.toLowerCase();
  if (
    ext.endsWith('.png') ||
    ext.endsWith('.webp') ||
    ext.endsWith('.gif') ||
    ext.endsWith('.svg') ||
    file.type === 'image/png' ||
    file.type === 'image/webp'
  ) {
    const sampleW = Math.min(width, 160);
    const sampleH = Math.min(height, 160);
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) {
          hasTransparency = true;
          break;
        }
      }
    }
  }

  return { width, height, hasTransparency };
}

function resolveMimeType(
  item: QueuedFileItem,
  settings: CompressionSettings
): { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; formatLabel: string; extension: string } {
  if (settings.outputFormat === 'jpeg') {
    return { mimeType: 'image/jpeg', formatLabel: 'JPG', extension: 'jpg' };
  }
  if (settings.outputFormat === 'png') {
    return { mimeType: 'image/png', formatLabel: 'PNG', extension: 'png' };
  }
  if (settings.outputFormat === 'webp') {
    return { mimeType: 'image/webp', formatLabel: 'WEBP', extension: 'webp' };
  }

  // Auto / Keep Original
  const orig = item.originalFormat.toUpperCase();
  if (orig === 'PNG') {
    return { mimeType: 'image/png', formatLabel: 'PNG', extension: 'png' };
  }
  if (orig === 'WEBP') {
    return { mimeType: 'image/webp', formatLabel: 'WEBP', extension: 'webp' };
  }
  if (orig === 'GIF' && item.hasTransparency) {
    return { mimeType: 'image/png', formatLabel: 'PNG', extension: 'png' };
  }
  return { mimeType: 'image/jpeg', formatLabel: 'JPG', extension: 'jpg' };
}

function resolveCropAndTargetDimensions(
  item: QueuedFileItem,
  settings: CompressionSettings
): { crop: CropRect; targetWidth: number; targetHeight: number } {
  const origW = item.originalWidth;
  const origH = item.originalHeight;

  // 1. Determine base crop rectangle (never auto-crop unless user enabled autoCropToFace or set manualCrop)
  let crop: CropRect = item.manualCrop
    ? { ...item.manualCrop }
    : { x: 0, y: 0, width: origW, height: origH };

  // Compute desired aspect ratio if both customWidth and customHeight are provided
  const hasBothDims =
    settings.customWidth !== null &&
    settings.customWidth > 0 &&
    settings.customHeight !== null &&
    settings.customHeight > 0;

  if (!item.manualCrop && settings.autoCropToFace) {
    const desiredRatio = hasBothDims
      ? (settings.customWidth as number) / (settings.customHeight as number)
      : undefined;
    crop = computeFaceSafeCrop(origW, origH, item.faces, desiredRatio);
  } else if (!item.manualCrop && hasBothDims && !settings.maintainAspectRatio) {
    // Even if aspect lock is off, NEVER stretch pixels—instead crop proportionally around face or center!
    const desiredRatio = (settings.customWidth as number) / (settings.customHeight as number);
    crop = computeFaceSafeCrop(origW, origH, settings.enableFaceDetection ? item.faces : [], desiredRatio);
  }

  // 2. Determine target pixel dimensions strictly preserving crop aspect ratio (never stretch!)
  const cropRatio = crop.width / crop.height;
  let targetWidth = crop.width;
  let targetHeight = crop.height;

  if (settings.customWidth && settings.customWidth > 0 && settings.customHeight && settings.customHeight > 0) {
    if (settings.maintainAspectRatio && !settings.autoCropToFace) {
      // Fit inside requested bounding box without stretching
      const scale = Math.min(settings.customWidth / crop.width, settings.customHeight / crop.height);
      targetWidth = Math.max(1, Math.round(crop.width * scale));
      targetHeight = Math.max(1, Math.round(crop.height * scale));
    } else {
      targetWidth = Math.max(1, Math.round(settings.customWidth));
      targetHeight = Math.max(1, Math.round(settings.customWidth / cropRatio));
    }
  } else if (settings.customWidth && settings.customWidth > 0) {
    targetWidth = Math.max(1, Math.round(settings.customWidth));
    targetHeight = Math.max(1, Math.round(targetWidth / cropRatio));
  } else if (settings.customHeight && settings.customHeight > 0) {
    targetHeight = Math.max(1, Math.round(settings.customHeight));
    targetWidth = Math.max(1, Math.round(targetHeight * cropRatio));
  }

  return { crop, targetWidth, targetHeight };
}

async function mainThreadCompressFallback(
  file: File,
  crop: CropRect,
  targetWidth: number,
  targetHeight: number,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  targetBytes: number,
  preserveTransparency: boolean
): Promise<{ blob: Blob; width: number; height: number; qualityUsed: number | null; status: QualityStatus }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Decode failed'));
      el.src = url;
    });

    const fillWhite = mimeType === 'image/jpeg' || !preserveTransparency;
    const renderCanvas = (w: number, h: number) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (fillWhite) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);
      return c;
    };

    const toBlob = (c: HTMLCanvasElement, q?: number) =>
      new Promise<Blob>((resolve, reject) => {
        c.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Encoding failed'))),
          mimeType,
          q
        );
      });

    let canvas = renderCanvas(targetWidth, targetHeight);
    if (mimeType === 'image/png') {
      const blob = await toBlob(canvas);
      return {
        blob,
        width: targetWidth,
        height: targetHeight,
        qualityUsed: null,
        status: blob.size <= targetBytes ? 'target_achieved' : 'target_impossible',
      };
    }

    let low = 0.35;
    let high = 0.95;
    let bestBlob = await toBlob(canvas, 0.85);
    let bestQ = 0.85;

    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      const candidate = await toBlob(canvas, mid);
      if (candidate.size <= targetBytes) {
        bestBlob = candidate;
        bestQ = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    if (bestBlob.size <= targetBytes) {
      return {
        blob: bestBlob,
        width: targetWidth,
        height: targetHeight,
        qualityUsed: Number(bestQ.toFixed(2)),
        status: bestQ >= 0.58 ? 'target_achieved' : 'achieved_low_quality',
      };
    }

    // Proportional scale fallback
    const ratio = crop.width / crop.height;
    let curW = targetWidth;
    let curH = targetHeight;
    for (const scale of [0.8, 0.62, 0.45, 0.3]) {
      curW = Math.max(80, Math.round(targetWidth * scale));
      curH = Math.max(80, Math.round(curW / ratio));
      canvas = renderCanvas(curW, curH);
      const attempt = await toBlob(canvas, 0.65);
      bestBlob = attempt;
      bestQ = 0.65;
      if (attempt.size <= targetBytes) {
        return {
          blob: attempt,
          width: curW,
          height: curH,
          qualityUsed: 0.65,
          status: 'achieved_with_resize',
        };
      }
    }

    return {
      blob: bestBlob,
      width: curW,
      height: curH,
      qualityUsed: bestQ,
      status: 'target_impossible',
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function processImageOrSvgFile(
  item: QueuedFileItem,
  settings: CompressionSettings,
  onProgress?: (percent: number, step: string) => void
): Promise<ProcessedFileResult> {
  const targetBytes = Math.round(settings.targetSizeKB * 1024);

  // Handle SVG vector optimization if keeping original format
  if (item.category === 'svg' && settings.outputFormat === 'auto') {
    onProgress?.(40, 'Optimizing SVG vectors...');
    const rawText = await item.file.text();
    const { safeSvg } = sanitizeSvgContent(rawText);
    const blob = new Blob([safeSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const reductionPercent = calculateReductionPercent(item.originalSizeBytes, blob.size);
    const status: QualityStatus =
      blob.size <= targetBytes ? 'target_achieved' : 'target_impossible';

    onProgress?.(100, 'Complete');
    return {
      blob,
      url,
      sizeBytes: blob.size,
      width: item.originalWidth,
      height: item.originalHeight,
      formatLabel: 'SVG',
      mimeType: 'image/svg+xml',
      extension: 'svg',
      qualityUsed: null,
      reductionPercent,
      status,
      warningMessageKey: status === 'target_impossible' ? 'warningTargetImpossible' : undefined,
    };
  }

  onProgress?.(20, 'Preparing canvas & crop framing...');
  const { mimeType, formatLabel, extension } = resolveMimeType(item, settings);
  const { crop, targetWidth, targetHeight } = resolveCropAndTargetDimensions(item, settings);

  // If file is already strictly under target, dimensions unchanged, same format, and no manual/auto crop,
  // still run light optimization at high quality and return best result within targetBytes.
  onProgress?.(45, 'Running intelligent compression...');

  let workerResult: {
    blob: Blob;
    width: number;
    height: number;
    qualityUsed: number | null;
    status: QualityStatus;
  };

  const worker = getWorker();
  if (worker) {
    const bitmap = await createImageBitmap(item.file);
    workerResult = await new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent<WorkerCompressResponse>) => {
        if (e.data.id !== item.id) return;
        worker.removeEventListener('message', handleMessage);
        if (!e.data.success || !e.data.blob) {
          reject(new Error(e.data.error || 'Worker failed'));
          return;
        }
        resolve({
          blob: e.data.blob,
          width: e.data.width ?? targetWidth,
          height: e.data.height ?? targetHeight,
          qualityUsed: e.data.qualityUsed ?? null,
          status: e.data.status ?? 'target_achieved',
        });
      };
      worker.addEventListener('message', handleMessage);
      const req: WorkerCompressRequest = {
        id: item.id,
        imageBitmap: bitmap,
        crop,
        targetWidth,
        targetHeight,
        mimeType,
        targetBytes,
        originalSizeBytes: item.originalSizeBytes,
        preserveTransparency: settings.preserveTransparency && item.hasTransparency,
      };
      worker.postMessage(req, [bitmap]);
    });
  } else {
    workerResult = await mainThreadCompressFallback(
      item.file,
      crop,
      targetWidth,
      targetHeight,
      mimeType,
      targetBytes,
      settings.preserveTransparency && item.hasTransparency
    );
  }

  onProgress?.(90, 'Verifying output size...');

  // Verify actual output size honestly
  const finalSize = workerResult.blob.size;
  let finalStatus = workerResult.status;

  if (item.originalSizeBytes <= targetBytes && finalSize <= targetBytes && finalStatus === 'target_achieved') {
    finalStatus = 'already_under_target';
  }
  if (finalSize > targetBytes) {
    finalStatus = 'target_impossible';
  }

  let warningMessageKey: string | undefined;
  if (finalStatus === 'target_impossible') {
    warningMessageKey = mimeType === 'image/png' ? 'warningPngLossless' : 'warningTargetImpossible';
  } else if (finalStatus === 'achieved_low_quality') {
    warningMessageKey = 'warningLowQuality';
  } else if (finalStatus === 'achieved_with_resize') {
    warningMessageKey = 'warningDimensionScaled';
  }

  const url = URL.createObjectURL(workerResult.blob);
  const reductionPercent = calculateReductionPercent(item.originalSizeBytes, finalSize);

  onProgress?.(100, 'Complete');

  return {
    blob: workerResult.blob,
    url,
    sizeBytes: finalSize,
    width: workerResult.width,
    height: workerResult.height,
    formatLabel,
    mimeType,
    extension,
    qualityUsed: workerResult.qualityUsed,
    reductionPercent,
    status: finalStatus,
    warningMessageKey,
  };
}
