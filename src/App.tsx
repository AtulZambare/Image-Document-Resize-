import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { CheckCircle2, Download, X } from 'lucide-react';
import samplePortraitUrl from './assets/images/sample_portrait_1794821983299.jpg';
import { ComparisonPanel } from './components/ComparisonPanel';
import { ControlPanel } from './components/ControlPanel';
import { Dropzone } from './components/Dropzone';
import { FileQueueTable } from './components/FileQueueTable';
import { ManualCropModal } from './components/ManualCropModal';
import { PrivacySection } from './components/PrivacySection';
import { TopBar } from './components/TopBar';
import { translations } from './i18n/translations';
import { detectFacesInImage } from './services/faceDetector';
import { validateUploadedFile } from './services/fileValidator';
import { inspectImageMetadata, processImageOrSvgFile } from './services/imageProcessor';
import { inspectPdfMetadata, processPdfFile, processTextDocumentFile } from './services/pdfProcessor';
import {
  CompressionSettings,
  CropRect,
  Language,
  ProcessedFileResult,
  QueuedFileItem,
  ValidationErrorItem,
} from './types/processor';
import { buildMeaningfulFilename } from './utils/formatters';

const DEFAULT_SETTINGS: CompressionSettings = {
  targetSizeKB: 100,
  outputFormat: 'auto',
  customWidth: null,
  customHeight: null,
  maintainAspectRatio: true,
  enableFaceDetection: true,
  autoCropToFace: false,
  preserveTransparency: true,
  pdfPreserveText: true,
  pdfAllowRasterFallback: false,
};

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<QueuedFileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropModalId, setCropModalId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const itemsRef = useRef<QueuedFileItem[]>([]);
  itemsRef.current = items;

  const settingsRef = useRef<CompressionSettings>(settings);
  settingsRef.current = settings;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Cleanup all object URLs on unmount
  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.originalPreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.originalPreviewUrl);
        }
        if (item.result?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(item.result.url);
        }
      }
    };
  }, []);

  const updateItem = useCallback((id: string, updater: (prev: QueuedFileItem) => QueuedFileItem) => {
    setItems((prev) => prev.map((it) => (it.id === id ? updater(it) : it)));
  }, []);

  const processSingleItem = useCallback(
    async (item: QueuedFileItem, activeSettings: CompressionSettings): Promise<boolean> => {
      updateItem(item.id, (prev) => ({
        ...prev,
        processingState: 'processing',
        progressPercent: 10,
        progressStep: 'Starting...',
        errorMessage: undefined,
      }));

      try {
        // Ensure face detection has completed before compressing if enabled on images
        let currentFaces = item.faces;
        if (
          item.category === 'image' &&
          activeSettings.enableFaceDetection &&
          item.faceDetectionStatus !== 'done'
        ) {
          updateItem(item.id, (prev) => ({
            ...prev,
            faceDetectionStatus: 'scanning',
            progressPercent: 15,
            progressStep: 'Scanning faces...',
          }));
          try {
            currentFaces = await detectFacesInImage(
              item.originalPreviewUrl,
              item.originalWidth,
              item.originalHeight
            );
            updateItem(item.id, (prev) => ({
              ...prev,
              faces: currentFaces,
              faceDetectionStatus: 'done',
            }));
          } catch {
            updateItem(item.id, (prev) => ({ ...prev, faceDetectionStatus: 'error' }));
          }
        }

        const enrichedItem: QueuedFileItem = { ...item, faces: currentFaces };

        const onProgress = (percent: number, step: string) => {
          updateItem(item.id, (prev) => ({
            ...prev,
            progressPercent: percent,
            progressStep: step,
          }));
        };

        let result: ProcessedFileResult;
        if (enrichedItem.category === 'pdf') {
          result = await processPdfFile(enrichedItem, activeSettings, onProgress);
        } else if (enrichedItem.category === 'text') {
          result = await processTextDocumentFile(enrichedItem, activeSettings, onProgress);
        } else {
          result = await processImageOrSvgFile(enrichedItem, activeSettings, onProgress);
        }

        // Revoke old compressed blob URL if present
        if (item.result?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(item.result.url);
        }

        updateItem(item.id, (prev) => ({
          ...prev,
          processingState: 'done',
          progressPercent: 100,
          progressStep: 'Done',
          result,
        }));
        return true;
      } catch (err) {
        updateItem(item.id, (prev) => ({
          ...prev,
          processingState: 'error',
          progressPercent: 0,
          progressStep: '',
          errorMessage: err instanceof Error ? err.message : t.errCorruptedFile,
        }));
        return false;
      }
    },
    [t.errCorruptedFile, updateItem]
  );

  const handleFilesSelected = useCallback(
    async (rawFiles: File[]) => {
      const newlyQueued: QueuedFileItem[] = [];
      const errors: ValidationErrorItem[] = [];

      for (const file of rawFiles) {
        const check = await validateUploadedFile(file);
        if (!check.valid) {
          errors.push((check as { valid: false; error: ValidationErrorItem }).error);
          continue;
        }

        const { category, originalFormat } = check.data;
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        try {
          let originalWidth = 0;
          let originalHeight = 0;
          let hasTransparency = false;
          let originalPreviewUrl = '';
          let originalPages: number | undefined;

          if (category === 'pdf') {
            const pdfMeta = await inspectPdfMetadata(file);
            originalWidth = pdfMeta.width;
            originalHeight = pdfMeta.height;
            originalPages = pdfMeta.pagesCount;
            originalPreviewUrl = pdfMeta.previewUrl;
          } else if (category === 'text') {
            originalWidth = 595;
            originalHeight = 842;
            originalPages = 1;
          } else {
            originalPreviewUrl = URL.createObjectURL(file);
            const imgMeta = await inspectImageMetadata(file, originalPreviewUrl);
            originalWidth = imgMeta.width;
            originalHeight = imgMeta.height;
            hasTransparency = imgMeta.hasTransparency;
          }

          newlyQueued.push({
            id,
            file,
            name: file.name,
            category,
            originalFormat,
            originalSizeBytes: file.size,
            originalWidth,
            originalHeight,
            originalPages,
            hasTransparency,
            originalPreviewUrl,
            faces: [],
            faceDetectionStatus: category === 'image' ? 'idle' : 'not_applicable',
            manualCrop: null,
            processingState: 'pending',
            progressPercent: 0,
            progressStep: '',
          });
        } catch {
          errors.push({
            id,
            fileName: file.name,
            reasonKey: 'corrupted_file',
          });
        }
      }

      if (errors.length > 0) {
        setValidationErrors((prev) => [...errors, ...prev].slice(0, 6));
      }

      if (newlyQueued.length === 0) return;

      setItems((prev) => [...prev, ...newlyQueued]);
      setSelectedId((prev) => prev ?? newlyQueued[0].id);

      setIsProcessingBatch(true);
      let okCount = 0;
      for (const item of newlyQueued) {
        const ok = await processSingleItem(item, settingsRef.current);
        if (ok) okCount++;
      }
      setIsProcessingBatch(false);

      if (okCount > 0) {
        showToast(newlyQueued.length === 1 ? t.toastSuccessSingle : t.toastSuccessBatch);
      }
    },
    [processSingleItem, showToast, t.toastSuccessBatch, t.toastSuccessSingle]
  );

  const handleLoadSamplePortrait = useCallback(async () => {
    try {
      const response = await fetch(samplePortraitUrl);
      const blob = await response.blob();
      const file = new File([blob], 'sample_portrait.jpg', { type: 'image/jpeg' });
      await handleFilesSelected([file]);
    } catch {
      setValidationErrors((prev) => [
        {
          id: `${Date.now()}-sample`,
          fileName: 'sample_portrait.jpg',
          reasonKey: 'corrupted_file',
        },
        ...prev,
      ]);
    }
  }, [handleFilesSelected]);

  const handleProcessAll = useCallback(async () => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) return;
    setIsProcessingBatch(true);
    let okCount = 0;
    for (const item of currentItems) {
      const ok = await processSingleItem(item, settingsRef.current);
      if (ok) okCount++;
    }
    setIsProcessingBatch(false);
    if (okCount > 0) {
      showToast(currentItems.length === 1 ? t.toastSuccessSingle : t.toastSuccessBatch);
    }
  }, [processSingleItem, showToast, t.toastSuccessBatch, t.toastSuccessSingle]);

  const handleApplyCrop = useCallback(
    async (id: string, crop: CropRect | null) => {
      setCropModalId(null);
      const targetItem = itemsRef.current.find((it) => it.id === id);
      if (!targetItem) return;

      const updated: QueuedFileItem = { ...targetItem, manualCrop: crop };
      updateItem(id, () => updated);

      setIsProcessingBatch(true);
      const ok = await processSingleItem(updated, settingsRef.current);
      setIsProcessingBatch(false);
      if (ok) showToast(t.toastSuccessSingle);
    },
    [processSingleItem, showToast, t.toastSuccessSingle, updateItem]
  );

  const handleDownloadSingle = useCallback((item: QueuedFileItem) => {
    if (!item.result) return;
    const fileName = buildMeaningfulFilename(
      item.name,
      item.result.sizeBytes,
      item.result.extension
    );
    const link = document.createElement('a');
    link.href = item.result.url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownloadAllZip = useCallback(async () => {
    const readyItems = itemsRef.current.filter((it) => it.result);
    if (readyItems.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const item of readyItems) {
        if (!item.result) continue;
        let fileName = buildMeaningfulFilename(
          item.name,
          item.result.sizeBytes,
          item.result.extension
        );
        if (usedNames.has(fileName)) {
          const dotIdx = fileName.lastIndexOf('.');
          fileName = `${fileName.slice(0, dotIdx)}_${item.id.slice(-4)}${fileName.slice(dotIdx)}`;
        }
        usedNames.add(fileName);
        zip.file(fileName, item.result.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `resized_files_${settingsRef.current.targetSizeKB}kb.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
      showToast(t.toastZipReady);
    } finally {
      setIsZipping(false);
    }
  }, [showToast, t.toastZipReady]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) {
        if (target.originalPreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(target.originalPreviewUrl);
        }
        if (target.result?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(target.result.url);
        }
      }
      const next = prev.filter((it) => it.id !== id);
      setSelectedId((currSel) => (currSel === id ? next[0]?.id ?? null : currSel));
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    for (const item of itemsRef.current) {
      if (item.originalPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.originalPreviewUrl);
      }
      if (item.result?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(item.result.url);
      }
    }
    setItems([]);
    setSelectedId(null);
    setValidationErrors([]);
    showToast(t.toastCleared);
  }, [showToast, t.toastCleared]);

  const selectedItem = items.find((it) => it.id === selectedId) ?? items[0] ?? null;
  const cropModalItem = items.find((it) => it.id === cropModalId) ?? null;
  const processedCount = items.filter((it) => it.result).length;
  const activeAspectRatio =
    selectedItem && selectedItem.originalHeight > 0
      ? selectedItem.originalWidth / selectedItem.originalHeight
      : null;

  return (
    <div className="min-h-screen bg-[#F5F9FF] text-[#0F172A]">
      <TopBar
        t={t}
        language={language}
        onLanguageChange={setLanguage}
        processedCount={processedCount}
        isZipping={isZipping}
        onDownloadAllZip={handleDownloadAllZip}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Clean Hero Header */}
        <section className="space-y-2">
          <h1
            className="max-w-3xl text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl"
            style={{ textWrap: 'balance' }}
          >
            {t.heroTitle}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#475569] sm:text-base">
            {t.heroSubtitle}
          </p>
        </section>

        {/* Main Workspace Layout: Left Control Sidebar + Main Upload/Preview Workspace */}
        <section id="workspace" className="flex flex-col items-start gap-6 lg:flex-row">
          <ControlPanel
            t={t}
            settings={settings}
            onChange={setSettings}
            onProcessAll={handleProcessAll}
            onClearAll={handleClearAll}
            hasFiles={items.length > 0}
            isProcessing={isProcessingBatch}
            activeAspectRatio={activeAspectRatio}
          />

          <div className="min-w-0 flex-1 w-full space-y-6">
            <Dropzone
              t={t}
              onFilesSelected={handleFilesSelected}
              onLoadSamplePortrait={handleLoadSamplePortrait}
              validationErrors={validationErrors}
              onDismissError={(id) =>
                setValidationErrors((prev) => prev.filter((err) => err.id !== id))
              }
            />

            {/* Mobile ZIP Button */}
            {processedCount > 0 && (
              <div className="flex sm:hidden">
                <button
                  type="button"
                  disabled={isZipping}
                  onClick={handleDownloadAllZip}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#1D63ED] px-4 py-2 text-sm font-semibold text-white"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {t.downloadAllZip} ({processedCount})
                  </span>
                </button>
              </div>
            )}

            <FileQueueTable
              t={t}
              items={items}
              selectedId={selectedItem?.id ?? null}
              onSelect={setSelectedId}
              onOpenCrop={setCropModalId}
              onDownload={handleDownloadSingle}
              onRemove={handleRemoveItem}
            />

            <ComparisonPanel
              t={t}
              item={selectedItem}
              targetSizeKB={settings.targetSizeKB}
              onOpenCrop={setCropModalId}
              onDownload={handleDownloadSingle}
            />
          </div>
        </section>

        <PrivacySection t={t} />
      </main>

      <footer className="mt-10 border-t border-[#DCE7F5] bg-white py-5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 text-xs text-[#64748B] sm:px-6 lg:px-8">
          <span>{t.appName}</span>
          <span>{t.privacyInlineNote}</span>
        </div>
      </footer>

      <ManualCropModal
        t={t}
        item={cropModalItem}
        onClose={() => setCropModalId(null)}
        onApplyCrop={handleApplyCrop}
      />

      {/* Processing Notification Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl border border-[#BFDBFE] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-1 rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Close notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
