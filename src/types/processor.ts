export type Language = 'en' | 'mr';

export type OutputImageFormat = 'auto' | 'jpeg' | 'png' | 'webp';

export type FileCategory = 'image' | 'pdf' | 'svg' | 'text';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  safeFrame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type QualityStatus =
  | 'target_achieved'
  | 'achieved_with_resize'
  | 'achieved_low_quality'
  | 'already_under_target'
  | 'target_impossible'
  | 'text_preserved_over_target';

export interface CompressionSettings {
  targetSizeKB: number; // Supported range: 55 to 200 KB
  outputFormat: OutputImageFormat;
  customWidth: number | null;
  customHeight: number | null;
  maintainAspectRatio: boolean;
  enableFaceDetection: boolean;
  autoCropToFace: boolean;
  preserveTransparency: boolean;
  pdfPreserveText: boolean;
  pdfAllowRasterFallback: boolean;
}

export interface ProcessedFileResult {
  blob: Blob;
  url: string;
  sizeBytes: number;
  width: number;
  height: number;
  formatLabel: string;
  mimeType: string;
  extension: string;
  qualityUsed: number | null;
  reductionPercent: number;
  status: QualityStatus;
  warningMessageKey?: string;
  warningDetails?: string;
  pagesCount?: number;
  searchableTextPreserved?: boolean;
  previewUrl?: string; // For PDFs, rendered page preview URL
  compressedPreviewUrl?: string; // For PDFs, rendered compressed page preview URL
}

export interface QueuedFileItem {
  id: string;
  file: File;
  name: string;
  category: FileCategory;
  originalFormat: string;
  originalSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  originalPages?: number;
  hasTransparency: boolean;
  originalPreviewUrl: string;
  pdfPreviewPagesCount?: number;
  faces: FaceBoundingBox[];
  faceDetectionStatus: 'idle' | 'scanning' | 'done' | 'not_applicable' | 'error';
  manualCrop: CropRect | null;
  processingState: 'pending' | 'processing' | 'done' | 'error';
  progressPercent: number;
  progressStep: string;
  errorMessage?: string;
  result?: ProcessedFileResult;
}

export interface ValidationErrorItem {
  id: string;
  fileName: string;
  reasonKey:
    | 'unsupported_type'
    | 'spoofed_signature'
    | 'file_too_large'
    | 'empty_file'
    | 'unsafe_content'
    | 'corrupted_file';
  details?: string;
}
