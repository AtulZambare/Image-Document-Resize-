import {
  AlertTriangle,
  CheckCircle2,
  Crop,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Translations } from '../i18n/translations';
import { QualityStatus, QueuedFileItem } from '../types/processor';
import { formatFileSize } from '../utils/formatters';

interface FileQueueTableProps {
  t: Translations;
  items: QueuedFileItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenCrop: (id: string) => void;
  onDownload: (item: QueuedFileItem) => void;
  onRemove: (id: string) => void;
}

export function getStatusMeta(status: QualityStatus, t: Translations): {
  label: string;
  toneClass: string;
  Icon: typeof CheckCircle2;
} {
  switch (status) {
    case 'target_achieved':
      return { label: t.statusTargetAchieved, toneClass: 'text-[#15803D]', Icon: CheckCircle2 };
    case 'already_under_target':
      return { label: t.statusAlreadyUnderTarget, toneClass: 'text-[#15803D]', Icon: CheckCircle2 };
    case 'achieved_with_resize':
      return { label: t.statusAchievedWithResize, toneClass: 'text-[#1D63ED]', Icon: CheckCircle2 };
    case 'achieved_low_quality':
      return { label: t.statusAchievedLowQuality, toneClass: 'text-[#B45309]', Icon: AlertTriangle };
    case 'text_preserved_over_target':
      return { label: t.statusTextPreservedOverTarget, toneClass: 'text-[#B45309]', Icon: AlertTriangle };
    case 'target_impossible':
      return { label: t.statusTargetImpossible, toneClass: 'text-[#B91C1C]', Icon: XCircle };
  }
}

export function FileQueueTable({
  t,
  items,
  selectedId,
  onSelect,
  onOpenCrop,
  onDownload,
  onRemove,
}: FileQueueTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[#DCE7F5] bg-white px-6 py-10 text-center">
        <p className="text-sm font-semibold text-[#1E293B]">{t.emptyQueueTitle}</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-[#64748B]">{t.emptyQueueDesc}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE7F5] bg-white">
      <div className="flex items-center justify-between border-b border-[#EDF3FA] px-5 py-3.5">
        <h3 className="text-sm font-bold text-[#0F172A]">{t.queueHeading}</h3>
        <span className="font-mono-nums text-xs font-medium text-[#64748B]">
          {items.length} {t.filesCount}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#EDF3FA] bg-[#F8FBFF] text-xs font-semibold text-[#475569]">
              <th className="px-4 py-2.5">{t.colFile}</th>
              <th className="px-4 py-2.5 text-right">{t.colOriginal}</th>
              <th className="px-4 py-2.5 text-right">{t.colOutput}</th>
              <th className="px-4 py-2.5 text-right">{t.colReduction}</th>
              <th className="px-4 py-2.5">{t.colStatus}</th>
              <th className="px-4 py-2.5 text-right">{t.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF3FA]">
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const statusMeta = item.result ? getStatusMeta(item.result.status, t) : null;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#EFF6FF]/75' : 'hover:bg-[#F8FBFF]'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#DCE7F5] bg-[#F4F8FD]">
                        {item.originalPreviewUrl ? (
                          <img
                            src={item.originalPreviewUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : item.category === 'pdf' || item.category === 'text' ? (
                          <FileText className="h-4 w-4 text-[#1D63ED]" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-[#1D63ED]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[180px] truncate font-semibold text-[#0F172A] sm:max-w-[240px]">
                          {item.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#64748B]">
                          <span>{item.originalFormat}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-nums">
                            {item.originalWidth} × {item.originalHeight}
                            {item.category === 'pdf' && item.originalPages
                              ? ` (${item.originalPages}p)`
                              : ' px'}
                          </span>
                          {item.category === 'image' && item.faceDetectionStatus === 'done' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className={item.faces.length > 0 ? 'text-[#1D63ED] font-medium' : ''}>
                                {item.faces.length > 0
                                  ? `${item.faces.length} ${t.facesDetectedLabel}`
                                  : t.noFacesDetected}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="font-mono-nums px-4 py-3 text-right text-xs font-medium text-[#334155] whitespace-nowrap">
                    {formatFileSize(item.originalSizeBytes)}
                  </td>

                  <td className="font-mono-nums px-4 py-3 text-right text-xs font-semibold text-[#0F172A] whitespace-nowrap">
                    {item.result ? formatFileSize(item.result.sizeBytes) : '—'}
                  </td>

                  <td className="font-mono-nums px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                    {item.result ? (
                      <span
                        className={
                          item.result.reductionPercent >= 0 ? 'text-[#15803D]' : 'text-[#B45309]'
                        }
                      >
                        {item.result.reductionPercent >= 0
                          ? `-${item.result.reductionPercent.toFixed(1)}%`
                          : `+${Math.abs(item.result.reductionPercent).toFixed(1)}%`}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {item.processingState === 'processing' ? (
                      <div className="w-32 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#1D63ED]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                          <span className="truncate">{item.progressPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DBEAFE]">
                          <div
                            className="h-full bg-[#1D63ED] transition-all duration-200"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : item.processingState === 'error' ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.statusError}</span>
                      </div>
                    ) : statusMeta ? (
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusMeta.toneClass}`}>
                        <statusMeta.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="whitespace-nowrap">{statusMeta.label}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748B]">{t.statusPending}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        title={t.inspectBtn}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-[#DCE7F5] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] hover:border-[#93C5FD] hover:text-[#1D63ED] whitespace-nowrap"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="hidden xl:inline">{t.inspectBtn}</span>
                      </button>

                      {item.category === 'image' && (
                        <button
                          type="button"
                          onClick={() => onOpenCrop(item.id)}
                          title={t.cropFaceBtn}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-[#DCE7F5] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] hover:border-[#93C5FD] hover:text-[#1D63ED] whitespace-nowrap"
                        >
                          <Crop className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden xl:inline">{t.cropFaceBtn}</span>
                        </button>
                      )}

                      {item.result && (
                        <button
                          type="button"
                          onClick={() => onDownload(item)}
                          title={t.downloadBtn}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-1 text-xs font-semibold text-[#1D63ED] hover:bg-[#DBEAFE] whitespace-nowrap"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">{t.downloadBtn}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        title={t.removeBtn}
                        aria-label={t.removeBtn}
                        className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-transparent px-2 py-1 text-xs text-[#64748B] hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
