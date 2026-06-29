'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { SmartScanner } from '@/components/ui/SmartScanner'
import { normalizeSpecies } from '@/lib/species';

export default function ScannerClient({ pets }: { pets: any[] }) {
  const router = useRouter()
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    pets.length === 1 ? pets[0].id : null
  )

  const handleSave = async (data: any) => {
    if (!selectedPetId) return
    const { record_type, parsed } = data

    try {
      if (record_type === 'vaccine_card') {
        await fetch(`/api/pets/${selectedPetId}/treatments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disease_name: parsed.title || parsed.vaccine_name || 'Aşı Kaydı',
            category: 'Aşı Uygulaması',
            status: 'Tamamlandı',
            start_date: parsed.date || new Date().toISOString().split('T')[0],
            clinic_name: parsed.vet_name || '',
            notes: parsed.lot_number ? `Lot: ${parsed.lot_number}` : '',
          }),
        })
      } else if (record_type === 'food_packaging') {
        await fetch(`/api/pets/${selectedPetId}/nutrition/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            food_brand: parsed.food_brand,
            food_product: parsed.food_product,
            food_type: parsed.food_type,
          }),
        })
      } else if (record_type === 'medicine_packaging' || record_type === 'parasite_product') {
        await fetch(`/api/pets/${selectedPetId}/treatments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disease_name: parsed.title || parsed.product_name || 'Tedavi Kaydı',
            category: record_type === 'parasite_product' ? 'İç/Dış Parazit Uygulaması' : 'İlaç Tedavisi',
            status: 'Tamamlandı',
            start_date: new Date().toISOString().split('T')[0],
            notes: parsed.active_ingredient || '',
          }),
        })
      }
    } catch (err) {
      console.error('Tarama kaydedilemedi:', err)
    } finally {
      router.replace(`/owner/pets/${selectedPetId}`)
    }
  }

  if (selectedPetId) {
    return (
      <SmartScanner 
        petId={selectedPetId}
        onClose={() => router.replace('/owner/dashboard')}
        onSave={handleSave}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col pt-12 p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold text-slate-800">Akıllı Tarama</h1>
        <button
          onClick={() => router.replace('/owner/dashboard')}
          className="p-2 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <p className="text-slate-600 mb-6 font-medium">Hangi can dostunuz için tarama yapacaksınız?</p>

      <div className="grid gap-4">
        {pets.map(pet => (
          <button
            key={pet.id}
            onClick={() => setSelectedPetId(pet.id)}
            className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-primary hover:shadow-md transition-all text-left"
          >
            <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden relative shrink-0">
              {pet.avatar_url ? (
                <Image src={pet.avatar_url} alt={pet.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  {normalizeSpecies(pet.species) === 'dog' ? '🐶' : '🐱'}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">{pet.name}</h3>
              <p className="text-slate-500 text-sm">{normalizeSpecies(pet.species) === 'dog' ? 'Köpek' : 'Kedi'}</p>
            </div>
            <div className="ml-auto text-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
