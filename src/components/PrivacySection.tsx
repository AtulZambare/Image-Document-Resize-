import { CheckCircle2, FileCheck2, Lock, Trash2 } from 'lucide-react';
import { Translations } from '../i18n/translations';

interface PrivacySectionProps {
  t: Translations;
}

export function PrivacySection({ t }: PrivacySectionProps) {
  const points = [
    { icon: Lock, title: t.privacyPoint1Title, desc: t.privacyPoint1Desc },
    { icon: FileCheck2, title: t.privacyPoint2Title, desc: t.privacyPoint2Desc },
    { icon: Trash2, title: t.privacyPoint3Title, desc: t.privacyPoint3Desc },
    { icon: CheckCircle2, title: t.privacyPoint4Title, desc: t.privacyPoint4Desc },
  ];

  return (
    <section
      id="privacy"
      className="rounded-xl border border-[#DCE7F5] bg-white p-6 space-y-5"
    >
      <div className="border-b border-[#EDF3FA] pb-3.5">
        <h2 className="text-base font-bold text-[#0F172A]">{t.privacySectionTitle}</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {points.map((pt, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] text-[#1D63ED]">
              <pt.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-[#0F172A]">{pt.title}</h3>
            <p className="text-xs leading-relaxed text-[#475569]">{pt.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
