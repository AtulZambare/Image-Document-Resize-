import { Download, Globe, Layers } from 'lucide-react';
import { Translations } from '../i18n/translations';
import { Language } from '../types/processor';

interface TopBarProps {
  t: Translations;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  processedCount: number;
  isZipping: boolean;
  onDownloadAllZip: () => void;
}

export function TopBar({
  t,
  language,
  onLanguageChange,
  processedCount,
  isZipping,
  onDownloadAllZip,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#DCE7F5] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#workspace"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 sm:text-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE]">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>{t.appName}</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#475569]">
          <a
            href="#workspace"
            className="hover:text-[#1D63ED] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navWorkspace}
          </a>
          <a
            href="#comparison"
            className="hover:text-[#1D63ED] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navComparison}
          </a>
          <a
            href="#privacy"
            className="hover:text-[#1D63ED] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navPrivacy}
          </a>
        </nav>

        {/* Zone 3: Language Switcher & Primary Download Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            role="group"
            aria-label="Language switcher"
            className="flex items-center rounded-lg border border-[#DCE7F5] bg-[#F4F8FD] p-0.5"
          >
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                language === 'en'
                  ? 'bg-white text-[#1D63ED] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span>EN</span>
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('mr')}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                language === 'mr'
                  ? 'bg-white text-[#1D63ED] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              मराठी
            </button>
          </div>

          <button
            type="button"
            disabled={processedCount === 0 || isZipping}
            onClick={onDownloadAllZip}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[#1D63ED] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-[#93C5FD] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D63ED]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {t.downloadAllZip}
              {processedCount > 0 ? ` (${processedCount})` : ''}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
