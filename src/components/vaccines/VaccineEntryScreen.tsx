'use client'

interface Props {
  petId: string;
  petName: string;
  onSelect: (mode: 'smart_start' | 'historical_import' | 'fresh_start') => void;
}

export function VaccineEntryScreen({ petId, petName, onSelect }: Props) {
  return (
    <div data-testid="vaccine-entry-screen" className="flex flex-col gap-4 px-1 py-4">
      <div className="text-center mb-4">
        <p className="text-base font-bold text-gray-900">
          {petName} için aşı takibini birlikte başlatalım
        </p>
        <p className="text-xs text-gray-500 mt-1.5 font-medium leading-relaxed max-w-sm mx-auto">
          Elinde aşı karnesi varsa tarayabilir, istersen sana uygun planı otomatik oluşturabiliriz. İstediğin zaman değiştirebilirsin.
        </p>
      </div>

      {/* Seçenek 1 — Bana plan oluştur */}
      <button
        onClick={() => onSelect('smart_start')}
        data-testid="vaccine-entry-smart-start-button"
        className="w-full rounded-2xl border border-purple-200 bg-purple-50/50
                   p-4.5 text-left transition-all hover:border-purple-300 hover:bg-purple-50
                   active:scale-[0.98] min-h-[56px]"
      >
        <div className="flex items-start gap-3.5">
          <span className="text-[22px] select-none" role="img" aria-label="plan">📋</span>
          <div>
            <p className="font-bold text-purple-950 text-[14px]">Bana plan oluştur</p>
            <p className="text-[12px] text-purple-800 mt-0.5 leading-normal font-medium">
              Petimin yaşına göre aşı takvimi hazırla, hatırlatıcıları kur.
            </p>
          </div>
        </div>
      </button>

      {/* Seçenek 2 — Karneyi tara */}
      <button
        onClick={() => onSelect('historical_import')}
        data-testid="vaccine-entry-historical-import-button"
        className="w-full rounded-2xl border border-blue-200 bg-blue-50/50
                   p-4.5 text-left transition-all hover:border-blue-300 hover:bg-blue-50
                   active:scale-[0.98] min-h-[56px]"
      >
        <div className="flex items-start gap-3.5">
          <span className="text-[22px] select-none" role="img" aria-label="camera">📷</span>
          <div>
            <p className="font-bold text-blue-950 text-[14px]">Karneyi tara</p>
            <p className="text-[12px] text-blue-800 mt-0.5 leading-normal font-medium">
              Elimde aşı karnesi veya fotoğrafı var, hızlıca aktarayım.
            </p>
          </div>
        </div>
      </button>

      {/* Seçenek 3 — Kendim ekleyeceğim */}
      <button
        onClick={() => onSelect('fresh_start')}
        data-testid="vaccine-entry-fresh-start-button"
        className="w-full rounded-2xl border border-gray-250 bg-gray-50/50
                   p-4.5 text-left transition-all hover:border-gray-350 hover:bg-gray-50
                   active:scale-[0.98] min-h-[56px]"
      >
        <div className="flex items-start gap-3.5">
          <span className="text-[22px] select-none" role="img" aria-label="edit">✏️</span>
          <div>
            <p className="font-bold text-gray-900 text-[14px]">Kendim ekleyeceğim</p>
            <p className="text-[12px] text-gray-700 mt-0.5 leading-normal font-medium">
              Aşı bilgilerini biliyorum, manuel olarak gireceğim.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
