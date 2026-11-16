import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, ScanFace, X } from 'lucide-react';
import { Translations } from '../i18n/translations';
import { computeFaceSafeCrop } from '../services/faceDetector';
import { CropRect, QueuedFileItem } from '../types/processor';

interface ManualCropModalProps {
  t: Translations;
  item: QueuedFileItem | null;
  onClose: () => void;
  onApplyCrop: (id: string, crop: CropRect | null) => void;
}

export function ManualCropModal({ t, item, onClose, onApplyCrop }: ManualCropModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 100, height: 100 });
  const [dragState, setDragState] = useState<{
    mode: 'move' | 'se';
    startX: number;
    startY: number;
    initialCrop: CropRect;
  } | null>(null);

  useEffect(() => {
    if (!item) return;
    setCrop(
      item.manualCrop ?? {
        x: 0,
        y: 0,
        width: item.originalWidth,
        height: item.originalHeight,
      }
    );
  }, [item]);

  if (!item) return null;

  const imgW = item.originalWidth;
  const imgH = item.originalHeight;

  const clampCrop = (next: CropRect): CropRect => {
    const w = Math.max(32, Math.min(imgW, Math.round(next.width)));
    const h = Math.max(32, Math.min(imgH, Math.round(next.height)));
    const x = Math.max(0, Math.min(imgW - w, Math.round(next.x)));
    const y = Math.max(0, Math.min(imgH - h, Math.round(next.y)));
    return { x, y, width: w, height: h };
  };

  const handlePointerDown = (e: React.PointerEvent, mode: 'move' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...crop },
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const scaleX = imgW / rect.width;
    const scaleY = imgH / rect.height;
    const dx = (e.clientX - dragState.startX) * scaleX;
    const dy = (e.clientY - dragState.startY) * scaleY;

    if (dragState.mode === 'move') {
      setCrop(
        clampCrop({
          ...dragState.initialCrop,
          x: dragState.initialCrop.x + dx,
          y: dragState.initialCrop.y + dy,
        })
      );
    } else {
      const nextW = Math.max(48, Math.min(imgW - dragState.initialCrop.x, dragState.initialCrop.width + dx));
      const nextH = Math.max(48, Math.min(imgH - dragState.initialCrop.y, dragState.initialCrop.height + dy));
      setCrop(
        clampCrop({
          ...dragState.initialCrop,
          width: nextW,
          height: nextH,
        })
      );
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  const handleSnapToFace = () => {
    const faceSafe = computeFaceSafeCrop(imgW, imgH, item.faces);
    setCrop(faceSafe);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0, width: imgW, height: imgH });
  };

  const handleConfirm = () => {
    const isFull =
      crop.x === 0 && crop.y === 0 && crop.width === imgW && crop.height === imgH;
    onApplyCrop(item.id, isFull ? null : crop);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-crop-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#DCE7F5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EDF3FA] px-5 py-4">
          <div>
            <h3 id="manual-crop-title" className="text-base font-bold text-[#0F172A]">
              {t.manualCropTitle}
            </h3>
            <p className="mt-0.5 text-xs text-[#64748B]">{t.manualCropSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label={t.cancelBtn}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Interactive Crop Canvas */}
          <div className="flex justify-center rounded-lg border border-[#DCE7F5] bg-[#F4F8FD] p-4">
            <div
              ref={containerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative inline-block select-none touch-none"
            >
              <img
                src={item.originalPreviewUrl}
                alt={item.name}
                referrerPolicy="no-referrer"
                draggable={false}
                className="block max-h-[380px] w-auto max-w-full"
              />

              {/* Detected face markers */}
              {item.faces.map((face, idx) => (
                <div
                  key={idx}
                  className="pointer-events-none absolute border border-dashed border-[#38BDF8]"
                  style={{
                    left: `${(face.x / imgW) * 100}%`,
                    top: `${(face.y / imgH) * 100}%`,
                    width: `${(face.width / imgW) * 100}%`,
                    height: `${(face.height / imgH) * 100}%`,
                  }}
                />
              ))}

              {/* Active Crop Box */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'move')}
                style={{
                  left: `${(crop.x / imgW) * 100}%`,
                  top: `${(crop.y / imgH) * 100}%`,
                  width: `${(crop.width / imgW) * 100}%`,
                  height: `${(crop.height / imgH) * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
                }}
                className="absolute cursor-move border-2 border-white"
              >
                <div className="pointer-events-none absolute inset-0 border border-[#1D63ED]" />
                {/* Corner Resize Handle */}
                <button
                  type="button"
                  aria-label="Resize crop corner"
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                  className="absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-[#1D63ED] shadow"
                />
              </div>
            </div>
          </div>

          {/* Action Toolbar & Numeric Coordinates */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {item.faces.length > 0 && (
                <button
                  type="button"
                  onClick={handleSnapToFace}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1D63ED] hover:bg-[#DBEAFE]"
                >
                  <ScanFace className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.snapToFaceBtn}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DCE7F5] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F8FBFF]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.resetCropBtn}</span>
              </button>
            </div>
            <span className="text-xs text-[#64748B]">{t.cropFaceSafeHint}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#475569]">{t.cropX}</label>
              <input
                type="number"
                value={crop.x}
                onChange={(e) => setCrop(clampCrop({ ...crop, x: Number(e.target.value) || 0 }))}
                className="font-mono-nums w-full rounded-lg border border-[#CBD5E1] bg-[#F8FBFF] px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#475569]">{t.cropY}</label>
              <input
                type="number"
                value={crop.y}
                onChange={(e) => setCrop(clampCrop({ ...crop, y: Number(e.target.value) || 0 }))}
                className="font-mono-nums w-full rounded-lg border border-[#CBD5E1] bg-[#F8FBFF] px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#475569]">{t.cropWidth}</label>
              <input
                type="number"
                value={crop.width}
                onChange={(e) =>
                  setCrop(clampCrop({ ...crop, width: Number(e.target.value) || 32 }))
                }
                className="font-mono-nums w-full rounded-lg border border-[#CBD5E1] bg-[#F8FBFF] px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#475569]">{t.cropHeight}</label>
              <input
                type="number"
                value={crop.height}
                onChange={(e) =>
                  setCrop(clampCrop({ ...crop, height: Number(e.target.value) || 32 }))
                }
                className="font-mono-nums w-full rounded-lg border border-[#CBD5E1] bg-[#F8FBFF] px-2.5 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#EDF3FA] bg-[#F8FBFF] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9]"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[38px] rounded-lg bg-[#1D63ED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
          >
            {t.applyCropBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
