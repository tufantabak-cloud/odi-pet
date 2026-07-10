'use client';

import Link from 'next/link';

export default function VaccineSettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-[28px]">
        💉
      </div>
      <div className="flex flex-col gap-2 max-w-xs">
        <h1 className="text-[20px] font-black text-text-primary">Yakında</h1>
        <p className="text-[13px] text-text-secondary font-medium leading-relaxed">
          Aşı şablonu ayarları şu anda yeniden yapılandırılıyor. Bu ekran geçici olarak kullanım dışı.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
        <Link
          href="/owner/profile"
          className="w-full min-h-[48px] flex items-center justify-center rounded-xl border-2 border-border-main text-[13px] font-bold text-text-primary"
        >
          Geri Dön
        </Link>
        <Link
          href="/owner/pets"
          className="w-full min-h-[48px] flex items-center justify-center rounded-xl bg-primary text-white text-[13px] font-bold"
        >
          Petlerime Git
        </Link>
      </div>
    </div>
  );
}
