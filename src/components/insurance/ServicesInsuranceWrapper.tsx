'use client'

import { useState } from 'react'
import InsuranceWidget from './InsuranceWidget'

export default function ServicesInsuranceWrapper({ pets, plan }: { pets: any[]; plan: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets.length === 1 ? pets[0].id : null)

  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="card-base p-5 border border-border-main hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 bg-white"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500/10 to-green-500/10 text-lime-600 flex items-center justify-center text-[24px] shrink-0">
          🛡️
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-extrabold text-text-primary">Can Dostu Sigortası</h3>
          <p className="text-[13px] text-text-secondary mt-0.5">Petinizin sigorta uygunluk skorunu öğrenin.</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold transition-transform group-hover:scale-110">
          +
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[14px] font-extrabold text-text-primary flex items-center gap-2">
          <span className="text-[18px]">🛡️</span> Can Dostu Sigortası
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-[12px] font-bold text-text-secondary hover:text-primary transition-colors bg-bg-main px-3 py-1.5 rounded-lg">
          Vazgeç
        </button>
      </div>

      {pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
          {pets.map(pet => (
            <button
              key={pet.id}
              onClick={() => setSelectedPetId(pet.id)}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${
                selectedPetId === pet.id 
                  ? 'bg-primary text-white shadow-md scale-[1.02]' 
                  : 'bg-white border border-border-main text-text-secondary hover:border-primary/30 hover:text-text-primary'
              }`}
            >
              {pet.name} İçin
            </button>
          ))}
        </div>
      )}

      {selectedPetId ? (
        <InsuranceWidget petId={selectedPetId} plan={plan} />
      ) : (
        <div className="card-base p-6 border border-dashed border-border-main bg-white/50 flex flex-col items-center justify-center text-center gap-2">
          <p className="font-bold text-text-primary text-[14px]">Hangi petiniz için işlem yapmak istiyorsunuz?</p>
          <p className="text-[12px] text-text-secondary">Yukarıdaki butonlardan bir pet seçin.</p>
        </div>
      )}
    </div>
  )
}
