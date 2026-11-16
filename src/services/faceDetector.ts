import * as faceapi from '@vladmandic/face-api';
import { CropRect, FaceBoundingBox } from '../types/processor';

let modelsLoaded = false;
let modelLoadPromise: Promise<boolean> | null = null;

async function ensureFaceApiModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      // Ensure TensorFlow backend works cleanly even in headless/no-WebGL environments
      const tf = (faceapi as unknown as { tf?: { setBackend: (b: string) => Promise<void>; ready: () => Promise<void>; getBackend: () => string } }).tf;
      if (tf) {
        try {
          await tf.ready();
        } catch {
          try {
            await tf.setBackend('cpu');
            await tf.ready();
          } catch {
            // continue and let faceapi try
          }
        }
      }

      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      modelsLoaded = true;
      return true;
    } catch (err) {
      console.warn('Face detection model initialization failed, checking native fallback:', err);
      modelLoadPromise = null;
      return false;
    }
  })();

  return modelLoadPromise;
}

function buildSafePortraitFrame(
  rawBox: { x: number; y: number; width: number; height: number },
  imgWidth: number,
  imgHeight: number
): FaceBoundingBox['safeFrame'] {
  // Generous portrait margins: 42% above forehead for hair/headroom,
  // 32% below chin for neck/collar, 28% on left/right sides for ears/shoulders
  const padTop = rawBox.height * 0.42;
  const padBottom = rawBox.height * 0.32;
  const padLeft = rawBox.width * 0.28;
  const padRight = rawBox.width * 0.28;

  const x = Math.max(0, Math.round(rawBox.x - padLeft));
  const y = Math.max(0, Math.round(rawBox.y - padTop));
  const right = Math.min(imgWidth, Math.round(rawBox.x + rawBox.width + padRight));
  const bottom = Math.min(imgHeight, Math.round(rawBox.y + rawBox.height + padBottom));

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

export async function detectFacesInImage(imageUrl: string, naturalWidth: number, naturalHeight: number): Promise<FaceBoundingBox[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load image for face detection'));
    el.src = imageUrl;
  });

  // Downscale large images onto a temporary canvas for fast detection (< 640px max dim)
  const maxDetectDim = 640;
  const scale = Math.min(1, maxDetectDim / Math.max(naturalWidth, naturalHeight));
  const detectW = Math.max(1, Math.round(naturalWidth * scale));
  const detectH = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = detectW;
  canvas.height = detectH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, detectW, detectH);

  // 1. Primary: local @vladmandic/face-api TinyFaceDetector
  const loaded = await ensureFaceApiModels();
  if (loaded) {
    try {
      const detections = await faceapi.detectAllFaces(
        canvas,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
      );

      if (detections && detections.length > 0) {
        return detections.map((det) => {
          const box = {
            x: Math.max(0, Math.round(det.box.x / scale)),
            y: Math.max(0, Math.round(det.box.y / scale)),
            width: Math.max(1, Math.round(det.box.width / scale)),
            height: Math.max(1, Math.round(det.box.height / scale)),
          };
          return {
            ...box,
            confidence: det.score,
            safeFrame: buildSafePortraitFrame(box, naturalWidth, naturalHeight),
          };
        });
      }
    } catch (err) {
      console.warn('TinyFaceDetector execution fallback:', err);
    }
  }

  // 2. Secondary: Browser native Shape Detection API (if available)
  const win = window as unknown as {
    FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
      detect: (source: HTMLCanvasElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
    };
  };

  if (typeof win.FaceDetector === 'function') {
    try {
      const detector = new win.FaceDetector({ fastMode: false, maxDetectedFaces: 10 });
      const results = await detector.detect(canvas);
      if (results.length > 0) {
        return results.map((r) => {
          const box = {
            x: Math.max(0, Math.round(r.boundingBox.x / scale)),
            y: Math.max(0, Math.round(r.boundingBox.y / scale)),
            width: Math.max(1, Math.round(r.boundingBox.width / scale)),
            height: Math.max(1, Math.round(r.boundingBox.height / scale)),
          };
          return {
            ...box,
            confidence: 0.9,
            safeFrame: buildSafePortraitFrame(box, naturalWidth, naturalHeight),
          };
        });
      }
    } catch {
      // ignore if unsupported on platform
    }
  }

  return [];
}

/**
 * Computes a face-safe crop rectangle for a desired target aspect ratio (or portrait framing).
 * Guarantees that detected faces (including safe headroom & chin) are centered and never clipped
 * whenever the image dimensions permit.
 */
export function computeFaceSafeCrop(
  imgWidth: number,
  imgHeight: number,
  faces: FaceBoundingBox[],
  targetAspectRatio?: number
): CropRect {
  if (faces.length === 0) {
    if (!targetAspectRatio) {
      return { x: 0, y: 0, width: imgWidth, height: imgHeight };
    }
    const currentRatio = imgWidth / imgHeight;
    if (Math.abs(currentRatio - targetAspectRatio) < 0.01) {
      return { x: 0, y: 0, width: imgWidth, height: imgHeight };
    }
    if (currentRatio > targetAspectRatio) {
      const cropW = Math.round(imgHeight * targetAspectRatio);
      return { x: Math.round((imgWidth - cropW) / 2), y: 0, width: cropW, height: imgHeight };
    } else {
      const cropH = Math.round(imgWidth / targetAspectRatio);
      return { x: 0, y: Math.round((imgHeight - cropH) / 2), width: imgWidth, height: cropH };
    }
  }

  // Union of all detected safe portrait frames
  let minX = imgWidth;
  let minY = imgHeight;
  let maxX = 0;
  let maxY = 0;
  for (const face of faces) {
    minX = Math.min(minX, face.safeFrame.x);
    minY = Math.min(minY, face.safeFrame.y);
    maxX = Math.max(maxX, face.safeFrame.x + face.safeFrame.width);
    maxY = Math.max(maxY, face.safeFrame.y + face.safeFrame.height);
  }

  const unionW = maxX - minX;
  const unionH = maxY - minY;
  const unionCenterX = minX + unionW / 2;
  const unionCenterY = minY + unionH / 2;

  // If no specific target aspect ratio is forced, frame nicely around the portrait with balanced breathing room
  const desiredRatio = targetAspectRatio ?? imgWidth / imgHeight;

  // Start with a comfortable portrait crop that contains the union safeFrame with extra 25% framing
  let cropW = Math.max(unionW * 1.25, unionH * 1.25 * desiredRatio);
  let cropH = cropW / desiredRatio;

  // If no custom ratio was passed and we just want face-centered framing, ensure at least 75% of original short side
  if (!targetAspectRatio) {
    const minExtentW = Math.min(imgWidth, Math.max(unionW * 1.45, imgWidth * 0.72));
    cropW = minExtentW;
    cropH = cropW / desiredRatio;
  }

  // Clamp crop size so it fits within image bounds without distorting ratio
  if (cropW > imgWidth) {
    cropW = imgWidth;
    cropH = cropW / desiredRatio;
  }
  if (cropH > imgHeight) {
    cropH = imgHeight;
    cropW = cropH * desiredRatio;
  }

  // Ensure union safe frame fits inside crop whenever physically possible
  if (cropW < unionW && unionW <= imgWidth) {
    const scaleUp = Math.min(imgWidth / cropW, imgHeight / cropH);
    const needed = unionW / cropW;
    const factor = Math.min(scaleUp, needed);
    cropW *= factor;
    cropH *= factor;
  }
  if (cropH < unionH && unionH <= imgHeight) {
    const scaleUp = Math.min(imgWidth / cropW, imgHeight / cropH);
    const needed = unionH / cropH;
    const factor = Math.min(scaleUp, needed);
    cropW *= factor;
    cropH *= factor;
  }

  // Center around the face union center, biased slightly upward so head/hair never clip
  let x = unionCenterX - cropW / 2;
  let y = unionCenterY - cropH * 0.46;

  // Clamp strictly inside image edges
  x = Math.max(0, Math.min(imgWidth - cropW, x));
  y = Math.max(0, Math.min(imgHeight - cropH, y));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(cropW)),
    height: Math.max(1, Math.round(cropH)),
  };
}
