import { CropRect, QualityStatus } from '../types/processor';

export interface WorkerCompressRequest {
  id: string;
  imageBitmap: ImageBitmap;
  crop: CropRect;
  targetWidth: number;
  targetHeight: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  targetBytes: number;
  originalSizeBytes: number;
  preserveTransparency: boolean;
}

export interface WorkerCompressResponse {
  id: string;
  success: boolean;
  blob?: Blob;
  width?: number;
  height?: number;
  qualityUsed?: number | null;
  status?: QualityStatus;
  error?: string;
}

function quantizeImageData(imageData: ImageData, levelsPerChannel: number): ImageData {
  const data = imageData.data;
  const step = 255 / (levelsPerChannel - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(Math.round(data[i] / step) * step);
    data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
    data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
    if (data[i + 3] < 250 && data[i + 3] > 5) {
      data[i + 3] = Math.round(Math.round(data[i + 3] / 32) * 32);
    }
  }
  return imageData;
}

async function renderToCanvas(
  bitmap: ImageBitmap,
  crop: CropRect,
  outW: number,
  outH: number,
  fillWhiteBackground: boolean
): Promise<OffscreenCanvas> {
  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d', { alpha: !fillWhiteBackground });
  if (!ctx) throw new Error('Could not acquire 2D OffscreenCanvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (fillWhiteBackground) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outW, outH);
  }

  ctx.drawImage(
    bitmap,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outW,
    outH
  );

  return canvas;
}

async function encodeLossyBinarySearch(
  canvas: OffscreenCanvas,
  mimeType: 'image/jpeg' | 'image/webp',
  targetBytes: number,
  minQuality = 0.38,
  maxQuality = 0.96
): Promise<{ blob: Blob; quality: number }> {
  // First check max quality
  const highBlob = await canvas.convertToBlob({ type: mimeType, quality: maxQuality });
  if (highBlob.size <= targetBytes) {
    return { blob: highBlob, quality: maxQuality };
  }

  let low = minQuality;
  let high = maxQuality;
  let bestBlob: Blob | null = null;
  let bestQuality = minQuality;

  for (let i = 0; i < 9; i++) {
    const mid = (low + high) / 2;
    const candidate = await canvas.convertToBlob({ type: mimeType, quality: mid });
    if (candidate.size <= targetBytes) {
      bestBlob = candidate;
      bestQuality = mid;
      low = mid;
    } else {
      high = mid;
    }
    if (high - low < 0.015) break;
  }

  if (bestBlob) {
    return { blob: bestBlob, quality: Number(bestQuality.toFixed(2)) };
  }

  // Return minimum quality candidate if none met targetBytes
  const minBlob = await canvas.convertToBlob({ type: mimeType, quality: minQuality });
  return { blob: minBlob, quality: minQuality };
}

self.onmessage = async (event: MessageEvent<WorkerCompressRequest>) => {
  const req = event.data;
  try {
    const { id, imageBitmap, crop, targetWidth, targetHeight, mimeType, targetBytes, preserveTransparency } = req;
    const fillWhite = mimeType === 'image/jpeg' || !preserveTransparency;

    let currentW = Math.max(1, Math.round(targetWidth));
    let currentH = Math.max(1, Math.round(targetHeight));
    const aspectRatio = crop.width / crop.height;

    if (mimeType === 'image/png') {
      // Lossless PNG path: try full size -> gentle color quantization -> proportional downscaling if needed
      let canvas = await renderToCanvas(imageBitmap, crop, currentW, currentH, false);
      let blob = await canvas.convertToBlob({ type: 'image/png' });

      if (blob.size <= targetBytes) {
        const res: WorkerCompressResponse = {
          id,
          success: true,
          blob,
          width: currentW,
          height: currentH,
          qualityUsed: null,
          status: 'target_achieved',
        };
        self.postMessage(res);
        imageBitmap.close();
        return;
      }

      // Try gentle palette quantization (reduces PNG deflate entropy cleanly)
      const quantLevels = [24, 14, 8];
      for (const levels of quantLevels) {
        const qCanvas = await renderToCanvas(imageBitmap, crop, currentW, currentH, false);
        const qCtx = qCanvas.getContext('2d');
        if (qCtx) {
          const imgData = qCtx.getImageData(0, 0, currentW, currentH);
          qCtx.putImageData(quantizeImageData(imgData, levels), 0, 0);
          const qBlob = await qCanvas.convertToBlob({ type: 'image/png' });
          if (qBlob.size < blob.size) {
            blob = qBlob;
          }
          if (blob.size <= targetBytes) {
            const res: WorkerCompressResponse = {
              id,
              success: true,
              blob,
              width: currentW,
              height: currentH,
              qualityUsed: null,
              status: levels >= 14 ? 'target_achieved' : 'achieved_low_quality',
            };
            self.postMessage(res);
            imageBitmap.close();
            return;
          }
        }
      }

      // Proportional downscale steps for PNG while preserving exact aspect ratio
      const scaleFactors = [0.85, 0.72, 0.6, 0.48, 0.38, 0.28];
      for (const factor of scaleFactors) {
        const nextW = Math.max(64, Math.round(targetWidth * factor));
        const nextH = Math.max(64, Math.round(nextW / aspectRatio));
        canvas = await renderToCanvas(imageBitmap, crop, nextW, nextH, false);
        const sCtx = canvas.getContext('2d');
        if (sCtx) {
          const imgData = sCtx.getImageData(0, 0, nextW, nextH);
          sCtx.putImageData(quantizeImageData(imgData, 16), 0, 0);
        }
        const sBlob = await canvas.convertToBlob({ type: 'image/png' });
        blob = sBlob;
        currentW = nextW;
        currentH = nextH;
        if (blob.size <= targetBytes) {
          const res: WorkerCompressResponse = {
            id,
            success: true,
            blob,
            width: currentW,
            height: currentH,
            qualityUsed: null,
            status: 'achieved_with_resize',
          };
          self.postMessage(res);
          imageBitmap.close();
          return;
        }
      }

      const res: WorkerCompressResponse = {
        id,
        success: true,
        blob,
        width: currentW,
        height: currentH,
        qualityUsed: null,
        status: blob.size <= targetBytes ? 'achieved_with_resize' : 'target_impossible',
      };
      self.postMessage(res);
      imageBitmap.close();
      return;
    }

    // Lossy JPG / WEBP intelligent binary search + proportional scaling path
    let canvas = await renderToCanvas(imageBitmap, crop, currentW, currentH, fillWhite);
    let { blob, quality } = await encodeLossyBinarySearch(canvas, mimeType, targetBytes, 0.48, 0.96);

    if (blob.size <= targetBytes) {
      const res: WorkerCompressResponse = {
        id,
        success: true,
        blob,
        width: currentW,
        height: currentH,
        qualityUsed: quality,
        status: quality >= 0.58 ? 'target_achieved' : 'achieved_low_quality',
      };
      self.postMessage(res);
      imageBitmap.close();
      return;
    }

    // Try slightly lower quality down to 0.30 before scaling dimensions
    const aggressive = await encodeLossyBinarySearch(canvas, mimeType, targetBytes, 0.30, 0.48);
    if (aggressive.blob.size <= targetBytes) {
      const res: WorkerCompressResponse = {
        id,
        success: true,
        blob: aggressive.blob,
        width: currentW,
        height: currentH,
        qualityUsed: aggressive.quality,
        status: 'achieved_low_quality',
      };
      self.postMessage(res);
      imageBitmap.close();
      return;
    }

    // Proportionally scale dimensions step by step while preserving high visual sharpness (quality 0.62–0.85)
    const scaleSteps = [0.88, 0.76, 0.65, 0.54, 0.44, 0.35, 0.26, 0.20];
    let bestCandidate = aggressive.blob;
    let bestCandidateW = currentW;
    let bestCandidateH = currentH;
    let bestCandidateQ = aggressive.quality;

    for (const scale of scaleSteps) {
      const nextW = Math.max(80, Math.round(targetWidth * scale));
      const nextH = Math.max(80, Math.round(nextW / aspectRatio));
      canvas = await renderToCanvas(imageBitmap, crop, nextW, nextH, fillWhite);
      const attempt = await encodeLossyBinarySearch(canvas, mimeType, targetBytes, 0.45, 0.90);

      bestCandidate = attempt.blob;
      bestCandidateW = nextW;
      bestCandidateH = nextH;
      bestCandidateQ = attempt.quality;

      if (attempt.blob.size <= targetBytes) {
        const res: WorkerCompressResponse = {
          id,
          success: true,
          blob: attempt.blob,
          width: nextW,
          height: nextH,
          qualityUsed: attempt.quality,
          status: 'achieved_with_resize',
        };
        self.postMessage(res);
        imageBitmap.close();
        return;
      }
    }

    // Final fallback at min reasonable quality if still slightly above target
    const lastAttempt = await encodeLossyBinarySearch(canvas, mimeType, targetBytes, 0.22, 0.45);
    if (lastAttempt.blob.size < bestCandidate.size) {
      bestCandidate = lastAttempt.blob;
      bestCandidateQ = lastAttempt.quality;
    }

    const res: WorkerCompressResponse = {
      id,
      success: true,
      blob: bestCandidate,
      width: bestCandidateW,
      height: bestCandidateH,
      qualityUsed: bestCandidateQ,
      status: bestCandidate.size <= targetBytes ? 'achieved_low_quality' : 'target_impossible',
    };
    self.postMessage(res);
    imageBitmap.close();
  } catch (err) {
    const res: WorkerCompressResponse = {
      id: req.id,
      success: false,
      error: err instanceof Error ? err.message : 'Compression worker error',
    };
    self.postMessage(res);
  }
};
