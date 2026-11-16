import React, { useRef, useState } from 'react';
import { AlertCircle, FileUp, ShieldCheck, UserCheck, X } from 'lucide-react';
import { Translations } from '../i18n/translations';
import { ValidationErrorItem } from '../types/processor';

interface DropzoneProps {
  t: Translations;
  onFilesSelected: (files: File[]) => void;
  onLoadSamplePortrait: () => void;
  validationErrors: ValidationErrorItem[];
  onDismissError: (id: string) => void;
}

export function Dropzone({
  t,
  onFilesSelected,
  onLoadSamplePortrait,
  validationErrors,
  onDismissError,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const getErrorText = (reasonKey: ValidationErrorItem['reasonKey']) => {
    switch (reasonKey) {
      case 'unsupported_type':
        return t.errUnsupportedType;
      case 'spoofed_signature':
        return t.errSpoofedSignature;
      case 'file_too_large':
        return t.errFileTooLarge;
      case 'empty_file':
        return t.errEmptyFile;
      case 'unsafe_content':
        return t.errUnsafeContent;
      default:
        return t.errCorruptedFile;
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
          isDragging
            ? 'border-[#1D63ED] bg-[#EFF6FF]'
            : 'border-[#BFDBFE] bg-white hover:border-[#60A5FA] hover:bg-[#F8FBFF]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,.svg,.bmp,.gif,.txt,.md,.csv,image/jpeg,image/png,image/webp,application/pdf,image/svg+xml,image/bmp,image/gif,text/plain,text/csv"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
          aria-label={t.browseFiles}
        />

        <div className="mx-auto flex max-w-xl flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] text-[#1D63ED]">
            <FileUp className="h-6 w-6" aria-hidden="true" />
          </div>

          <h2 className="text-lg font-semibold text-[#0F172A]">{t.dropzoneTitle}</h2>
          <p className="mt-1 text-sm text-[#475569]">{t.dropzoneSubtitle}</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#1D63ED] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              <span>{t.browseFiles}</span>
            </button>

            <button
              type="button"
              onClick={onLoadSamplePortrait}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#F4F8FD] px-4 py-2 text-sm font-medium text-[#1E3A8A] transition-colors hover:bg-[#E0ECFF] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
            >
              <UserCheck className="h-4 w-4 text-[#1D63ED]" aria-hidden="true" />
              <span>{t.loadSamplePortrait}</span>
            </button>
          </div>

          <div className="mt-4 flex flex-col items-center gap-1 text-xs text-[#64748B]">
            <span>{t.supportedFormatsNote}</span>
            <span className="inline-flex items-center gap-1.5 text-[#3B82F6]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t.privacyInlineNote}</span>
            </span>
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="space-y-2" role="alert" aria-live="polite">
          {validationErrors.map((err) => (
            <div
              key={err.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
                <div>
                  <span className="font-semibold">{err.fileName}: </span>
                  <span>{getErrorText(err.reasonKey)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismissError(err.id)}
                className="rounded p-1 text-[#991B1B] hover:bg-[#FEE2E2]"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
