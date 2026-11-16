import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Crop,
  Download,
  ScanFace,
  SlidersHorizontal,
} from 'lucide-react';
import { Translations } from '../i18n/translations';
import { renderPdfPagePreview } from '../services/pdfProcessor';
import { QueuedFileItem } from '../types/processor';
import { formatFileSize } from '../utils/formatters';
import { getStatusMeta } from './FileQueueTable';

interface ComparisonPanelProps {
  t: Translations;
  item: QueuedFileItem | null;
  targetSizeKB: number;
  onOpenCrop: (id: string) => void;
  onDownload: (item: QueuedFileItem) => void;
}

export function ComparisonPanel({
  t,
  item,
  targetSizeKB,
  onOpenCrop,
  onDownload,
}: ComparisonPanelProps) {
  const [viewMode, setViewMode] = useState<'side_by_side' | 'split'>('side_by_side');
  const [splitPercent, setSplitPercent] = useState(50);
  const [showFaceOverlay, setShowFaceOverlay] = useState(true);

  // Multi-page PDF inspection state
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfOrigPageUrl, setPdfOrigPageUrl] = useState<string | null>(null);
  const [pdfCompPageUrl, setPdfCompPageUrl] = useState<string | null>(null);
  const [loadingPdfPage, setLoadingPdfPage] = useState(false);

  useEffect(() => {
    setPdfPage(1);
    setPdfOrigPageUrl(null);
    setPdfCompPageUrl(null);
  }, [item?.id]);

  useEffect(() => {
    if (!item || item.category !== 'pdf') return;
    if (pdfPage === 1) {
      setPdfOrigPageUrl(item.originalPreviewUrl || null);
      setPdfCompPageUrl(item.result?.compressedPreviewUrl || null);
      return;
    }

    let cancelled = false;
    setLoadingPdfPage(true);
    (async () => {
      try {
        const origBuf = await item.file.arrayBuffer();
        const origRendered = await renderPdfPagePreview(origBuf, pdfPage, 900);
        if (!cancelled) setPdfOrigPageUrl(origRendered.dataUrl);

        if (item.result?.blob) {
          const compBuf = await item.result.blob.arrayBuffer();
          const compRendered = await renderPdfPagePreview(compBuf, pdfPage, 900);
          if (!cancelled) setPdfCompPageUrl(compRendered.dataUrl);
        }
      } catch {
        // ignore page render errors
      } finally {
        if (!cancelled) setLoadingPdfPage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item, pdfPage]);

  if (!item) {
    return null;
  }

  const origImageUrl =
    item.category === 'pdf'
      ? pdfOrigPageUrl || item.originalPreviewUrl
      : item.originalPreviewUrl;

  const compImageUrl =
    item.category === 'pdf'
      ? pdfCompPageUrl || item.result?.compressedPreviewUrl || ''
      : item.result?.url || '';

  const statusMeta = item.result ? getStatusMeta(item.result.status, t) : null;

  const getWarningText = (key?: string): string | null => {
    if (!key) return null;
    const map: Record<string, string> = {
      warningTargetImpossible: t.warningTargetImpossible,
      warningLowQuality: t.warningLowQuality,
      warningPngLossless: t.warningPngLossless,
      warningPdfTextPreserved: t.warningPdfTextPreserved,
      warningDimensionScaled: t.warningDimensionScaled,
    };
    return map[key] || null;
  };

  const warningText = getWarningText(item.result?.warningMessageKey);
  const totalPages = item.result?.pagesCount || item.originalPages || 1;

  return (
    <section
      id="comparison"
      className="rounded-xl border border-[#DCE7F5] bg-white p-5 space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF3FA] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">{t.comparisonHeading}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
            <span className="font-medium text-[#334155]">{item.name}</span>
            <span aria-hidden="true">·</span>
            <span>
              {item.faceDetectionStatus === 'scanning'
                ? t.scanningFaces
                : item.category === 'image'
                ? item.faces.length > 0
                  ? `${item.faces.length} ${t.facesDetectedLabel}`
                  : t.noFacesDetected
                : `${item.originalFormat} (${totalPages}p)`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.category === 'image' && item.faces.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFaceOverlay((v) => !v)}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                showFaceOverlay
                  ? 'border-[#1D63ED] bg-[#EFF6FF] text-[#1D63ED]'
                  : 'border-[#DCE7F5] bg-white text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <ScanFace className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.showFaceOverlay}</span>
            </button>
          )}

          {item.category === 'image' && (
            <button
              type="button"
              onClick={() => onOpenCrop(item.id)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#DCE7F5] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] hover:border-[#93C5FD] hover:text-[#1D63ED] whitespace-nowrap"
            >
              <Crop className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.cropFaceBtn}</span>
            </button>
          )}

          <div className="flex items-center rounded-lg border border-[#DCE7F5] bg-[#F4F8FD] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('side_by_side')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                viewMode === 'side_by_side'
                  ? 'bg-white text-[#1D63ED] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.sideBySideMode}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              disabled={!compImageUrl}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50 ${
                viewMode === 'split'
                  ? 'bg-white text-[#1D63ED] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.splitSliderMode}</span>
            </button>
          </div>

          {item.result && (
            <button
              type="button"
              onClick={() => onDownload(item)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#1D63ED] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E40AF] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.downloadBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning Notice if any */}
      {warningText && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs leading-relaxed text-[#92400E]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" aria-hidden="true" />
          <span>{warningText}</span>
        </div>
      )}

      {/* Multi-page PDF pager */}
      {item.category === 'pdf' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={pdfPage <= 1 || loadingPdfPage}
            onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-[#DCE7F5] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F8FBFF] disabled:opacity-45"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{t.prevPage}</span>
          </button>
          <span className="font-mono-nums text-xs font-semibold text-[#334155]">
            {t.pdfPageLabel} {pdfPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pdfPage >= totalPages || loadingPdfPage}
            onClick={() => setPdfPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-[#DCE7F5] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F8FBFF] disabled:opacity-45"
          >
            <span>{t.nextPage}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Visual Previews */}
      {viewMode === 'side_by_side' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Original Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#334155]">{t.originalLabel}</span>
              <span className="font-mono-nums text-[#64748B]">
                {formatFileSize(item.originalSizeBytes)} · {item.originalWidth} × {item.originalHeight}
              </span>
            </div>

            <div className="transparency-grid relative flex min-h-[280px] max-h-[440px] items-center justify-center overflow-hidden rounded-lg border border-[#DCE7F5] p-3">
              {origImageUrl ? (
                <div className="relative inline-flex max-h-[410px] max-w-full items-center justify-center">
                  <img
                    src={origImageUrl}
                    alt={`${t.originalLabel} - ${item.name}`}
                    referrerPolicy="no-referrer"
                    className="max-h-[410px] w-auto max-w-full object-contain"
                  />

                  {/* Face & Safe Frame Overlay */}
                  {item.category === 'image' &&
                    showFaceOverlay &&
                    item.faces.map((face, idx) => {
                      const leftPct = (face.x / item.originalWidth) * 100;
                      const topPct = (face.y / item.originalHeight) * 100;
                      const widthPct = (face.width / item.originalWidth) * 100;
                      const heightPct = (face.height / item.originalHeight) * 100;

                      const safeLeftPct = (face.safeFrame.x / item.originalWidth) * 100;
                      const safeTopPct = (face.safeFrame.y / item.originalHeight) * 100;
                      const safeWidthPct = (face.safeFrame.width / item.originalWidth) * 100;
                      const safeHeightPct = (face.safeFrame.height / item.originalHeight) * 100;

                      return (
                        <div key={idx} className="pointer-events-none">
                          {/* Safe headroom/chin framing */}
                          <div
                            className="absolute border border-dashed border-[#0284C7] bg-[#0284C7]/5"
                            style={{
                              left: `${safeLeftPct}%`,
                              top: `${safeTopPct}%`,
                              width: `${safeWidthPct}%`,
                              height: `${safeHeightPct}%`,
                            }}
                          />
                          {/* Exact detected face */}
                          <div
                            className="absolute border-2 border-[#1D63ED] bg-[#1D63ED]/10"
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${widthPct}%`,
                              height: `${heightPct}%`,
                            }}
                          >
                            <span className="absolute -top-5 left-0 rounded bg-[#1D63ED] px-1.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
                              Face {idx + 1}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <span className="text-xs text-[#64748B]">{t.statusPending}</span>
              )}
            </div>
          </div>

          {/* Compressed Output Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1D63ED]">{t.compressedLabel}</span>
              {item.result && (
                <span className="font-mono-nums text-[#334155]">
                  {formatFileSize(item.result.sizeBytes)} · {item.result.width} × {item.result.height}
                </span>
              )}
            </div>

            <div className="transparency-grid relative flex min-h-[280px] max-h-[440px] items-center justify-center overflow-hidden rounded-lg border border-[#DCE7F5] p-3">
              {compImageUrl ? (
                <img
                  src={compImageUrl}
                  alt={`${t.compressedLabel} - ${item.name}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[410px] w-auto max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-[#64748B]">
                  {item.processingState === 'processing'
                    ? `${item.progressPercent}% · ${item.progressStep}`
                    : t.statusPending}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Split Slider View */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>{t.originalLabel} ({formatFileSize(item.originalSizeBytes)})</span>
            <span>{t.dragToCompare}</span>
            <span className="font-semibold text-[#1D63ED]">
              {t.compressedLabel} ({item.result ? formatFileSize(item.result.sizeBytes) : '—'})
            </span>
          </div>
          <div className="transparency-grid relative mx-auto flex h-[360px] max-w-2xl select-none items-center justify-center overflow-hidden rounded-lg border border-[#DCE7F5]">
            {compImageUrl && origImageUrl && (
              <>
                <img
                  src={compImageUrl}
                  alt={t.compressedLabel}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
                >
                  <img
                    src={origImageUrl}
                    alt={t.originalLabel}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-[#1D63ED]"
                  style={{ left: `${splitPercent}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#1D63ED] bg-white text-[10px] font-bold text-[#1D63ED] shadow">
                    ↔
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                  aria-label={t.dragToCompare}
                  className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Detailed Size & Quality Metrics Grid */}
      {item.result && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[#EDF3FA] pt-4 sm:grid-cols-4">
          <div>
            <span className="block text-xs text-[#64748B]">{t.reportOriginalSize}</span>
            <span className="font-mono-nums text-sm font-semibold text-[#0F172A]">
              {formatFileSize(item.originalSizeBytes)}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#64748B]">{t.reportFinalSize}</span>
            <span className="font-mono-nums text-sm font-bold text-[#1D63ED]">
              {formatFileSize(item.result.sizeBytes)}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#64748B]">{t.reportTargetLimit}</span>
            <span className="font-mono-nums text-sm font-semibold text-[#334155]">
              {targetSizeKB} {t.kbUnit}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#64748B]">{t.reportCompression}</span>
            <span
              className={`font-mono-nums text-sm font-bold ${
                item.result.reductionPercent >= 0 ? 'text-[#15803D]' : 'text-[#B45309]'
              }`}
            >
              {item.result.reductionPercent >= 0
                ? `-${item.result.reductionPercent.toFixed(1)}%`
                : `+${Math.abs(item.result.reductionPercent).toFixed(1)}%`}
            </span>
          </div>

          <div>
            <span className="block text-xs text-[#64748B]">{t.reportOriginalDims}</span>
            <span className="font-mono-nums text-sm font-medium text-[#334155]">
              {item.originalWidth} × {item.originalHeight}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#64748B]">{t.reportFinalDims}</span>
            <span className="font-mono-nums text-sm font-medium text-[#334155]">
              {item.result.width} × {item.result.height}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#64748B]">{t.reportFormat}</span>
            <span className="text-sm font-semibold text-[#0F172A]">
              {item.result.formatLabel}
              {item.result.qualityUsed !== null
                ? ` (Q${Math.round(item.result.qualityUsed * 100)})`
                : ''}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#64748B]">{t.reportQualityStatus}</span>
            {statusMeta && (
              <span className={`inline-flex items-center gap-1 text-sm font-semibold ${statusMeta.toneClass}`}>
                <statusMeta.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{statusMeta.label}</span>
              </span>
            )}
          </div>

          {item.category === 'pdf' && (
            <>
              <div>
                <span className="block text-xs text-[#64748B]">{t.reportPages}</span>
                <span className="font-mono-nums text-sm font-semibold text-[#0F172A]">
                  {item.result.pagesCount ?? 1}
                </span>
              </div>
              <div>
                <span className="block text-xs text-[#64748B]">{t.reportSearchableText}</span>
                <span className="text-sm font-semibold text-[#0F172A]">
                  {item.result.searchableTextPreserved ? t.yesPreserved : t.noRasterized}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
