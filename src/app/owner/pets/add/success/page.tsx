'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()

  const petId   = params.get('id')   ?? ''
  const petName = params.get('name') ?? 'Dostunuz'
  const species = params.get('species') ?? ''

  if (!petId) {
    // Geçersiz erişim → forma dön
    router.replace('/owner/pets/add')
    return null
  }

  return (
    <div className="card-base p-8 flex flex-col items-center gap-6 animate-fadeInUp mt-10">
      {/* Başarı ikonu */}
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-[32px] text-success shadow-inner">
        ✓
      </div>

      <div className="text-center">
        <h1 className="text-[26px] font-extrabold text-text-primary mb-2">
          Aramıza Hoş Geldin, {petName}! 🎉
        </h1>
        <p className="text-[14px] text-text-secondary">
          {species ? `${species.toLowerCase()}inizin` : 'Dostunuzun'} temel profili başarıyla oluşturuldu.
        </p>
      </div>

      <p className="text-[13px] font-bold text-text-secondary uppercase tracking-widest mt-4">
        İlk Kurulum Adımı
      </p>

      <div className="flex flex-col w-full gap-3">
        {/* Fork 1: Aşı */}
        <button
          id="btn-setup-vaccines"
          onClick={() => router.push(`/owner/pets/${petId}/vaccines`)}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
        >
          <span className="text-[28px] group-hover:scale-110 transition-transform">💉</span>
          <div>
            <p className="font-extrabold text-primary text-[15px]">Aşı OS Kurulumu</p>
            <p className="text-[12px] text-text-secondary mt-0.5">Geçmiş aşıları aktarın veya takvim oluşturun.</p>
          </div>
        </button>

        {/* Fork 2: Beslenme */}
        <button
          id="btn-setup-nutrition"
          onClick={() => router.push(`/owner/pets/${petId}/nutrition`)}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-left group"
        >
          <span className="text-[28px] group-hover:scale-110 transition-transform">🍗</span>
          <div>
            <p className="font-extrabold text-blue-600 text-[15px]">Beslenme Planı</p>
            <p className="text-[12px] text-text-secondary mt-0.5">Öğün ve mama takibi için günlük plan oluşturun.</p>
          </div>
        </button>

        {/* Şimdi değil */}
        <button
          id="btn-goto-profile"
          onClick={() => router.push(`/owner/pets/${petId}`)}
          className="btn-secondary w-full py-4 text-[14px] mt-2 font-bold"
        >
          Şimdi Değil, Profile Git →
        </button>
      </div>
    </div>
  )
}

export default function PetAddSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
