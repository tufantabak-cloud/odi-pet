'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import CoachMark from '@/components/ui/CoachMark'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()

  const petId   = params.get('id')   ?? ''
  const petName = params.get('name') ?? 'Dostunuz'
  const species = params.get('species') ?? ''

  if (!petId) {
    router.replace('/owner/pets/add')
    return null
  }

  return (
    <div className="card-base p-8 sm:p-10 flex flex-col items-center gap-6 animate-fadeInUp mt-10 max-w-md mx-auto border border-primary/10">
      {/* Başarı ikonu */}
      <div className="w-20 h-20 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[40px] shadow-inner animate-bounce">
        🎉
      </div>

      <div className="text-center">
        <h1 className="text-[26px] font-black text-text-primary mb-2 leading-tight">
          Aramıza Hoş Geldin, {petName}!
        </h1>
        <p className="text-[14px] text-text-secondary leading-relaxed px-2">
          {species ? `${species.toLowerCase()}inizin` : 'Dostunuzun'} temel profili başarıyla oluşturuldu. Şimdi onu güvende tutmak için ilk önemli adımı atalım!
        </p>
      </div>

      <div className="flex flex-col w-full gap-3 mt-4 relative">
        {/* Tek bir ana CTA: Profile Git */}
        <button
          id="btn-goto-profile"
          onClick={() => router.push(`/owner/pets/${petId}`)}
          className="btn-primary w-full py-4 text-[15px] font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform rounded-[14px]"
        >
          Profile Git →
        </button>
      </div>
    </div>
  )
}

export default function PetAddSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
