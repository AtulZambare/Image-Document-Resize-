import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, rgb } from 'pdf-lib';
import { CompressionSettings, ProcessedFileResult, QualityStatus, QueuedFileItem } from '../types/processor';
import { calculateReductionPercent } from '../utils/formatters';

// Configure local pdf.js worker bundled in public/
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface PdfInspectionResult {
  pagesCount: number;
  width: number;
  height: number;
  previewUrl: string;
  hasSearchableText: boolean;
}

export async function renderPdfPagePreview(
  pdfBytes: ArrayBuffer | Uint8Array,
  pageNumber = 1,
  maxWidth = 900
): Promise<{ dataUrl: string; width: number; height: number; pagesCount: number; hasText: boolean }> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes),
  });
  const pdf = await loadingTask.promise;
  const safePageNum = Math.min(Math.max(1, pageNumber), pdf.numPages);
  const page = await pdf.getPage(safePageNum);

  const textContent = await page.getTextContent();
  const hasText = textContent.items.length > 0;

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2, maxWidth / Math.max(1, baseViewport.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize canvas context for PDF preview');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  await loadingTask.destroy();

  return {
    dataUrl,
    width: Math.round(baseViewport.width),
    height: Math.round(baseViewport.height),
    pagesCount: pdf.numPages,
    hasText,
  };
}

export async function inspectPdfMetadata(file: File): Promise<PdfInspectionResult> {
  const buffer = await file.arrayBuffer();
  const preview = await renderPdfPagePreview(buffer, 1, 900);
  return {
    pagesCount: preview.pagesCount,
    width: preview.width,
    height: preview.height,
    previewUrl: preview.dataUrl,
    hasSearchableText: preview.hasText,
  };
}

/**
 * Recompresses embedded DCTDecode (JPEG) image streams inside a PDFDocument
 * without disturbing text operators, fonts, vector lines, or page order.
 */
async function recompressEmbeddedPdfImages(
  pdfDoc: PDFDocument,
  maxImageDimension: number,
  jpegQuality: number
): Promise<number> {
  let recompressedCount = 0;
  const context = pdfDoc.context;
  const indirectObjects = context.enumerateIndirectObjects();

  for (const [ref, obj] of indirectObjects) {
    if (!(obj instanceof PDFRawStream)) continue;

    const dict = obj.dict;
    const subtype = dict.get(PDFName.of('Subtype'));
    if (subtype !== PDFName.of('Image')) continue;

    // Skip image masks or soft-mask alpha channels to keep transparency/layout intact
    if (dict.get(PDFName.of('ImageMask')) || dict.get(PDFName.of('SMask'))) {
      continue;
    }

    const filter = dict.get(PDFName.of('Filter'));
    const isJpeg =
      filter === PDFName.of('DCTDecode') ||
      (Array.isArray(filter) && filter.includes(PDFName.of('DCTDecode')));

    if (!isJpeg) continue;

    try {
      const rawBytes = obj.contents;
      const imgBlob = new Blob([new Uint8Array(rawBytes)], { type: 'image/jpeg' });
      const imgUrl = URL.createObjectURL(imgBlob);

      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('Embedded JPEG decode failed'));
          el.src = imgUrl;
        });

        const origW = img.naturalWidth;
        const origH = img.naturalHeight;
        if (origW <= 16 || origH <= 16) continue;

        const scale = Math.min(1, maxImageDimension / Math.max(origW, origH));
        const newW = Math.max(16, Math.round(origW * scale));
        const newH = Math.max(16, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newW, newH);

        const recompressedBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', jpegQuality)
        );

        if (recompressedBlob && recompressedBlob.size < rawBytes.length * 0.92) {
          const newBytes = new Uint8Array(await recompressedBlob.arrayBuffer());
          const newDict = dict.clone(context);
          newDict.set(PDFName.of('Width'), context.obj(newW));
          newDict.set(PDFName.of('Height'), context.obj(newH));
          newDict.set(PDFName.of('Length'), context.obj(newBytes.length));
          newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
          newDict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
          newDict.set(PDFName.of('BitsPerComponent'), context.obj(8));
          newDict.delete(PDFName.of('DecodeParms'));

          const replacement = PDFRawStream.of(newDict, newBytes);
          context.assign(ref, replacement);
          recompressedCount++;
        }
      } finally {
        URL.revokeObjectURL(imgUrl);
      }
    } catch {
      // Skip any exotic color-space JPEG safely without corrupting PDF
    }
  }

  return recompressedCount;
}

async function stripMetadataAndSave(pdfDoc: PDFDocument): Promise<Uint8Array> {
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('Smart Resizer');
  pdfDoc.setCreator('');

  // Remove heavy XMP metadata stream if present
  try {
    pdfDoc.catalog.delete(PDFName.of('Metadata'));
  } catch {
    // ignore
  }

  return await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
}

async function rasterizePdfPagesToTarget(
  originalBytes: ArrayBuffer,
  targetBytes: number,
  onProgress?: (percent: number, step: string) => void
): Promise<{ bytes: Uint8Array; pagesCount: number; width: number; height: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(originalBytes.slice(0)) });
  const srcPdf = await loadingTask.promise;
  const numPages = srcPdf.numPages;

  // Try balanced DPIs and JPEG qualities to keep document readable within targetBytes
  const profiles = [
    { maxDim: 1400, quality: 0.72 },
    { maxDim: 1100, quality: 0.62 },
    { maxDim: 900, quality: 0.54 },
    { maxDim: 750, quality: 0.45 },
  ];

  let bestBytes: Uint8Array | null = null;
  let lastW = 595;
  let lastH = 842;

  for (let pIdx = 0; pIdx < profiles.length; pIdx++) {
    const profile = profiles[pIdx];
    const outPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(55 + Math.round((i / numPages) * 30), `Optimizing page ${i}/${numPages}...`);
      const page = await srcPdf.getPage(i);
      const baseVp = page.getViewport({ scale: 1 });
      lastW = Math.round(baseVp.width);
      lastH = Math.round(baseVp.height);

      const scale = Math.min(2, profile.maxDim / Math.max(baseVp.width, baseVp.height));
      const vp = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(vp.width));
      canvas.height = Math.max(1, Math.round(vp.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

      const jpgBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', profile.quality)
      );
      if (!jpgBlob) continue;

      const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
      const embedded = await outPdf.embedJpg(jpgBytes);
      const newPage = outPdf.addPage([baseVp.width, baseVp.height]);
      newPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: baseVp.width,
        height: baseVp.height,
      });
    }

    const candidateBytes = await outPdf.save({ useObjectStreams: true });
    bestBytes = candidateBytes;
    if (candidateBytes.length <= targetBytes) {
      break;
    }
  }

  await loadingTask.destroy();
  if (!bestBytes) {
    throw new Error('Could not generate PDF output');
  }

  return { bytes: bestBytes, pagesCount: numPages, width: lastW, height: lastH };
}

export async function processPdfFile(
  item: QueuedFileItem,
  settings: CompressionSettings,
  onProgress?: (percent: number, step: string) => void
): Promise<ProcessedFileResult> {
  const targetBytes = Math.round(settings.targetSizeKB * 1024);
  const originalBuffer = await item.file.arrayBuffer();

  onProgress?.(20, 'Reading PDF structure & preserving layout...');
  const pdfDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: false });
  const pagesCount = pdfDoc.getPageCount();
  const firstPage = pdfDoc.getPage(0);
  const { width, height } = firstPage.getSize();

  // Tier 1: Clean structural optimization (object streams + metadata strip)
  onProgress?.(40, 'Optimizing PDF object streams...');
  let bestBytes = await stripMetadataAndSave(pdfDoc);
  let searchableTextPreserved = true;

  // Tier 2: If still above target, intelligently downscale/recompress embedded images inside the PDF
  // while keeping all searchable text, vector drawings, and page order 100% intact!
  if (bestBytes.length > targetBytes) {
    onProgress?.(60, 'Recompressing embedded images (text preserved)...');
    const embeddedProfiles = [
      { maxDim: 1400, quality: 0.72 },
      { maxDim: 1000, quality: 0.58 },
      { maxDim: 760, quality: 0.45 },
    ];

    for (const prof of embeddedProfiles) {
      const workDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: false });
      const changed = await recompressEmbeddedPdfImages(workDoc, prof.maxDim, prof.quality);
      if (changed > 0 || bestBytes.length === originalBuffer.byteLength) {
        const candidate = await stripMetadataAndSave(workDoc);
        if (candidate.length < bestBytes.length) {
          bestBytes = candidate;
        }
        if (bestBytes.length <= targetBytes) {
          break;
        }
      } else {
        break;
      }
    }
  }

  // Never keep a re-encoded PDF larger than original if original was already smaller
  if (bestBytes.length > originalBuffer.byteLength && originalBuffer.byteLength <= targetBytes) {
    bestBytes = new Uint8Array(originalBuffer);
  }

  // Tier 3: Explicit rasterization fallback ONLY if user explicitly opted in
  if (bestBytes.length > targetBytes && !settings.pdfPreserveText && settings.pdfAllowRasterFallback) {
    onProgress?.(75, 'Re-rendering PDF pages to fit strict KB limit...');
    const rasterized = await rasterizePdfPagesToTarget(originalBuffer, targetBytes, onProgress);
    if (rasterized.bytes.length < bestBytes.length) {
      bestBytes = rasterized.bytes;
      searchableTextPreserved = false;
    }
  } else if (bestBytes.length > targetBytes && settings.pdfAllowRasterFallback) {
    // Even if preserveText was checked, if user explicitly checked allowRasterFallback, use it only as last resort
    onProgress?.(75, 'Re-rendering PDF pages to fit strict KB limit...');
    const rasterized = await rasterizePdfPagesToTarget(originalBuffer, targetBytes, onProgress);
    if (rasterized.bytes.length < bestBytes.length) {
      bestBytes = rasterized.bytes;
      searchableTextPreserved = false;
    }
  }

  onProgress?.(92, 'Rendering compressed PDF preview...');
  const finalBlob = new Blob([new Uint8Array(bestBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(finalBlob);

  let compressedPreviewUrl = item.originalPreviewUrl;
  try {
    const rendered = await renderPdfPagePreview(bestBytes, 1, 900);
    compressedPreviewUrl = rendered.dataUrl;
  } catch {
    // keep fallback preview
  }

  const finalSize = finalBlob.size;
  const reductionPercent = calculateReductionPercent(item.originalSizeBytes, finalSize);

  let status: QualityStatus = 'target_achieved';
  let warningMessageKey: string | undefined;

  if (item.originalSizeBytes <= targetBytes && finalSize <= targetBytes) {
    status = 'already_under_target';
  } else if (finalSize <= targetBytes) {
    status = searchableTextPreserved ? 'target_achieved' : 'achieved_low_quality';
    if (!searchableTextPreserved) {
      warningMessageKey = 'warningLowQuality';
    }
  } else {
    status = searchableTextPreserved ? 'text_preserved_over_target' : 'target_impossible';
    warningMessageKey = searchableTextPreserved ? 'warningPdfTextPreserved' : 'warningTargetImpossible';
  }

  onProgress?.(100, 'Complete');

  return {
    blob: finalBlob,
    url,
    sizeBytes: finalSize,
    width: Math.round(width),
    height: Math.round(height),
    formatLabel: 'PDF',
    mimeType: 'application/pdf',
    extension: 'pdf',
    qualityUsed: null,
    reductionPercent,
    status,
    warningMessageKey,
    pagesCount,
    searchableTextPreserved,
    compressedPreviewUrl,
  };
}

/**
 * Converts practical plain-text documents (.txt, .md, .csv) into a clean, compressed,
 * searchable PDF or minified text depending on target size.
 */
export async function processTextDocumentFile(
  item: QueuedFileItem,
  settings: CompressionSettings,
  onProgress?: (percent: number, step: string) => void
): Promise<ProcessedFileResult> {
  onProgress?.(35, 'Formatting searchable PDF document...');
  const rawText = await item.file.text();
  const targetBytes = Math.round(settings.targetSizeKB * 1024);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10.5;
  const margin = 48;
  const pageW = 595;
  const pageH = 842;
  const maxLineWidth = pageW - margin * 2;
  const lineHeight = 14.5;

  const lines: string[] = [];
  for (const paragraph of rawText.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Clean non-WinAnsi chars safely so StandardFonts never throws
      const safeLine = testLine.replace(/[^\x20-\x7E]/g, ' ');
      if (font.widthOfTextAtSize(safeLine, fontSize) <= maxLineWidth) {
        currentLine = safeLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.replace(/[^\x20-\x7E]/g, ' ');
      }
    }
    lines.push(currentLine);
  }

  let page = pdfDoc.addPage([pageW, pageH]);
  let y = pageH - margin;
  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageW, pageH]);
      y = pageH - margin;
    }
    if (line.trim().length > 0) {
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.08, 0.1, 0.14) });
    }
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  let previewUrl: string | undefined;
  try {
    const rendered = await renderPdfPagePreview(pdfBytes, 1, 700);
    previewUrl = rendered.dataUrl;
  } catch {
    // ignore
  }

  const status: QualityStatus =
    blob.size <= targetBytes ? 'target_achieved' : 'text_preserved_over_target';

  onProgress?.(100, 'Complete');

  return {
    blob,
    url,
    sizeBytes: blob.size,
    width: pageW,
    height: pageH,
    formatLabel: 'PDF',
    mimeType: 'application/pdf',
    extension: 'pdf',
    qualityUsed: null,
    reductionPercent: calculateReductionPercent(item.originalSizeBytes, blob.size),
    status,
    warningMessageKey: status !== 'target_achieved' ? 'warningPdfTextPreserved' : undefined,
    pagesCount: pdfDoc.getPageCount(),
    searchableTextPreserved: true,
    compressedPreviewUrl: previewUrl,
  };
}
