import { useEffect, useState } from 'react';
import { Lock, Play, RefreshCw, Trash2, Unlock } from 'lucide-react';
import { Translations } from '../i18n/translations';
import { CompressionSettings, OutputImageFormat } from '../types/processor';

interface ControlPanelProps {
  t: Translations;
  settings: CompressionSettings;
  onChange: (next: CompressionSettings) => void;
  onProcessAll: () => void;
  onClearAll: () => void;
  hasFiles: boolean;
  isProcessing: boolean;
  activeAspectRatio: number | null;
}

const PRESET_KBS = [55, 75, 100, 150, 200];

export function ControlPanel({
  t,
  settings,
  onChange,
  onProcessAll,
  onClearAll,
  hasFiles,
  isProcessing,
  activeAspectRatio,
}: ControlPanelProps) {
  const [kbInput, setKbInput] = useState(String(settings.targetSizeKB));
  const [kbError, setKbError] = useState<string | null>(null);

  useEffect(() => {
    setKbInput(String(settings.targetSizeKB));
    setKbError(null);
  }, [settings.targetSizeKB]);

  const handlePresetClick = (kb: number) => {
    setKbError(null);
    setKbInput(String(kb));
    onChange({ ...settings, targetSizeKB: kb });
  };

  const handleKbInputChange = (val: string) => {
    setKbInput(val);
    const num = Number(val);
    if (!val || Number.isNaN(num)) {
      setKbError(t.errTargetRange);
      return;
    }
    if (num < 55 || num > 200) {
      setKbError(t.errTargetRange);
      return;
    }
    setKbError(null);
    onChange({ ...settings, targetSizeKB: Math.round(num) });
  };

  const handleKbBlur = () => {
    const num = Number(kbInput);
    if (Number.isNaN(num) || num < 55) {
      setKbInput('55');
      setKbError(null);
      onChange({ ...settings, targetSizeKB: 55 });
    } else if (num > 200) {
      setKbInput('200');
      setKbError(null);
      onChange({ ...settings, targetSizeKB: 200 });
    }
  };

  const handleWidthChange = (raw: string) => {
    if (!raw.trim()) {
      onChange({
        ...settings,
        customWidth: null,
        customHeight: settings.maintainAspectRatio ? null : settings.customHeight,
      });
      return;
    }
    const w = Math.max(16, Math.min(12000, Math.round(Number(raw))));
    if (Number.isNaN(w)) return;
    if (settings.maintainAspectRatio && activeAspectRatio && activeAspectRatio > 0) {
      onChange({
        ...settings,
        customWidth: w,
        customHeight: Math.max(16, Math.round(w / activeAspectRatio)),
      });
    } else {
      onChange({ ...settings, customWidth: w });
    }
  };

  const handleHeightChange = (raw: string) => {
    if (!raw.trim()) {
      onChange({
        ...settings,
        customHeight: null,
        customWidth: settings.maintainAspectRatio ? null : settings.customWidth,
      });
      return;
    }
    const h = Math.max(16, Math.min(12000, Math.round(Number(raw))));
    if (Number.isNaN(h)) return;
    if (settings.maintainAspectRatio && activeAspectRatio && activeAspectRatio > 0) {
      onChange({
        ...settings,
        customHeight: h,
        customWidth: Math.max(16, Math.round(h * activeAspectRatio)),
      });
    } else {
      onChange({ ...settings, customHeight: h });
    }
  };

  const formats: { value: OutputImageFormat; label: string }[] = [
    { value: 'auto', label: t.formatAuto },
    { value: 'jpeg', label: t.formatJpg },
    { value: 'png', label: t.formatPng },
    { value: 'webp', label: t.formatWebp },
  ];

  return (
    <aside className="w-full lg:w-[350px] shrink-0 rounded-xl border border-[#DCE7F5] bg-white p-5 space-y-6">
      <div className="flex items-center justify-between border-b border-[#EDF3FA] pb-3.5">
        <h2 className="text-base font-bold text-[#0F172A]">{t.controlsHeading}</h2>
        <span className="font-mono-nums text-xs font-semibold text-[#1D63ED]">
          {settings.targetSizeKB} {t.kbUnit}
        </span>
      </div>

      {/* 1. Target File Size */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="target-kb-input" className="text-sm font-semibold text-[#1E293B]">
            {t.targetSizeLabel}
          </label>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={55}
            max={200}
            step={1}
            value={settings.targetSizeKB}
            onChange={(e) => handlePresetClick(Number(e.target.value))}
            aria-label={t.targetSizeLabel}
            className="h-2 w-full cursor-pointer accent-[#1D63ED]"
          />
          <div className="relative w-24 shrink-0">
            <input
              id="target-kb-input"
              type="number"
              min={55}
              max={200}
              value={kbInput}
              onChange={(e) => handleKbInputChange(e.target.value)}
              onBlur={handleKbBlur}
              placeholder={t.customSizePlaceholder}
              className="font-mono-nums w-full rounded-lg border border-[#CBD5E1] bg-[#F8FBFF] py-1.5 pl-2.5 pr-8 text-sm font-semibold text-[#0F172A] focus:border-[#1D63ED] focus:bg-white focus:outline-none"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#64748B]">
              {t.kbUnit}
            </span>
          </div>
        </div>

        {kbError && <p className="text-xs font-medium text-[#DC2626]">{kbError}</p>}

        <div>
          <span className="mb-1.5 block text-xs font-medium text-[#64748B]">{t.quickPresetsLabel}</span>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_KBS.map((kb) => {
              const active = settings.targetSizeKB === kb;
              return (
                <button
                  key={kb}
                  type="button"
                  onClick={() => handlePresetClick(kb)}
                  className={`font-mono-nums min-h-[36px] rounded-lg border px-1.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[#1D63ED] bg-[#EFF6FF] text-[#1D63ED]'
                      : 'border-[#DCE7F5] bg-[#F8FBFF] text-[#334155] hover:border-[#93C5FD] hover:bg-[#EFF6FF]'
                  }`}
                >
                  {kb}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#64748B]">{t.targetRangeHint}</p>
      </section>

      <hr className="border-[#EDF3FA]" />

      {/* 2. Output Format */}
      <section className="space-y-2.5">
        <span className="block text-sm font-semibold text-[#1E293B]">{t.outputFormatLabel}</span>
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-[#DCE7F5] bg-[#F4F8FD] p-1">
          {formats.map((f) => {
            const active = settings.outputFormat === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ ...settings, outputFormat: f.value })}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                  active
                    ? 'bg-white text-[#1D63ED] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      <hr className="border-[#EDF3FA]" />

      {/* 3. Dimensions & Aspect Ratio */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#1E293B]">{t.dimensionsHeading}</span>
          <button
            type="button"
            onClick={() =>
              onChange({ ...settings, maintainAspectRatio: !settings.maintainAspectRatio })
            }
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              settings.maintainAspectRatio
                ? 'bg-[#EFF6FF] text-[#1D63ED]'
                : 'bg-[#F1F5F9] text-[#475569]'
            }`}
          >
            {settings.maintainAspectRatio ? (
              <Lock className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Unlock className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{settings.maintainAspectRatio ? 'Locked' : 'Crop-Fit'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="custom-width" className="mb-1 block text-xs font-medium text-[#475569]">
              {t.widthPx}
            </label>
            <input
              id="custom-width"
              type="number"
              min={16}
              max={12000}
              value={settings.customWidth ?? ''}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder={t.autoPlaceholder}
              className="font-mono-nums w-full rounded-lg border border-[#CBD5E1] bg-[#F8FBFF] px-2.5 py-1.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D63ED] focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="custom-height" className="mb-1 block text-xs font-medium text-[#475569]">
              {t.heightPx}
            </label>
            <input
              id="custom-height"
              type="number"
              min={16}
              max={12000}
              value={settings.customHeight ?? ''}
              onChange={(e) => handleHeightChange(e.target.value)}
              placeholder={t.autoPlaceholder}
              className="font-mono-nums w-full rounded-lg border border-[#CBD5E1] bg-[#F8FBFF] px-2.5 py-1.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D63ED] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
        <p className="text-xs leading-relaxed text-[#64748B]">{t.aspectRatioNotice}</p>
      </section>

      <hr className="border-[#EDF3FA]" />

      {/* 4. Smart Face Detection */}
      <section className="space-y-3">
        <span className="block text-sm font-semibold text-[#1E293B]">{t.faceDetectionHeading}</span>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={settings.enableFaceDetection}
            onChange={(e) =>
              onChange({
                ...settings,
                enableFaceDetection: e.target.checked,
                autoCropToFace: e.target.checked ? settings.autoCropToFace : false,
              })
            }
            className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] accent-[#1D63ED]"
          />
          <span className="text-xs leading-snug text-[#334155]">
            <strong className="block font-semibold text-[#0F172A]">{t.enableFaceDetection}</strong>
            <span className="text-[#64748B]">{t.faceDetectionDesc}</span>
          </span>
        </label>

        <label
          className={`flex items-start gap-2.5 ${
            settings.enableFaceDetection ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'
          }`}
        >
          <input
            type="checkbox"
            disabled={!settings.enableFaceDetection}
            checked={settings.autoCropToFace}
            onChange={(e) => onChange({ ...settings, autoCropToFace: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] accent-[#1D63ED]"
          />
          <span className="text-xs leading-snug text-[#334155]">
            <strong className="block font-semibold text-[#0F172A]">{t.autoCropToFace}</strong>
            <span className="text-[#64748B]">{t.autoCropDesc}</span>
          </span>
        </label>
      </section>

      <hr className="border-[#EDF3FA]" />

      {/* 5. Document & PDF Engine */}
      <section className="space-y-3">
        <span className="block text-sm font-semibold text-[#1E293B]">{t.pdfOptionsHeading}</span>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={settings.pdfPreserveText}
            onChange={(e) => onChange({ ...settings, pdfPreserveText: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] accent-[#1D63ED]"
          />
          <span className="text-xs leading-snug text-[#334155]">
            <strong className="block font-semibold text-[#0F172A]">{t.pdfPreserveText}</strong>
            <span className="text-[#64748B]">{t.pdfPreserveTextDesc}</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={settings.pdfAllowRasterFallback}
            onChange={(e) => onChange({ ...settings, pdfAllowRasterFallback: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] accent-[#1D63ED]"
          />
          <span className="text-xs leading-snug text-[#334155]">
            <strong className="block font-semibold text-[#0F172A]">{t.pdfAllowRaster}</strong>
            <span className="text-[#64748B]">{t.pdfAllowRasterDesc}</span>
          </span>
        </label>
      </section>

      {/* Primary CTA */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          disabled={!hasFiles || isProcessing || kbError !== null}
          onClick={onProcessAll}
          className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#1D63ED] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-[#93C5FD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
        >
          {isProcessing ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isProcessing ? t.processingBtn : t.processAllBtn}</span>
        </button>

        {hasFiles && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClearAll}
            className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-[#DCE7F5] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition-colors hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.clearTemporaryData}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
