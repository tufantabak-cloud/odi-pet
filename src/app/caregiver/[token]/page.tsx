import React from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { caregiverTokenRateLimit } from '@/lib/auth-security'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { PhoneCall, Stethoscope, AlertCircle, Info, ChevronDown } from 'lucide-react'
import { LogbookForm } from '@/components/caregiver/LogbookForm'
import Image from 'next/image'

interface CaregiverPageProps {
  params: {
    token: string
  }
}

async function getSharedCard(token: string) {
  const supabase = createAdminSupabaseClient()
  const { data: card, error } = await supabase
    .from('shared_pet_cards')
    .select('*, pets(*), profiles!shared_pet_cards_owner_user_id_fkey(full_name, phone)')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (error || !card) return null

  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    return null
  }
  return card
}

export default async function CaregiverPage({ params }: CaregiverPageProps) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() 
           || headersList.get('x-real-ip') 
           || '127.0.0.1'
  const rl = await caregiverTokenRateLimit.limit(ip)
  if (!rl.success) {
    notFound()
  }

  const card = await getSharedCard(params.token)

  if (!card) {
    notFound() // Yönlendir veya hata göster
  }

  const pet = card.pets
  const owner = card.profiles

  // Boş alan kontrolcüsü (Progressive Profiling gereği)
  const renderField = (value: string | null | undefined, emptyMessage: string) => {
    if (!value || value.trim() === '') {
      return <span className="text-slate-400 italic text-sm">{emptyMessage}</span>
    }
    return <span>{value}</span>
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Sticky Acil Yardım Butonu */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="container max-w-2xl mx-auto">
          <a 
            href={`tel:${owner?.phone || pet.vet_phone || '112'}`}
            className="w-full h-14 bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center space-x-2 rounded-xl transition-colors font-semibold text-lg"
          >
            <PhoneCall className="w-6 h-6 animate-pulse" />
            <span>Acil Yardım Ara</span>
          </a>
        </div>
      </div>

      <main className="container max-w-2xl mx-auto p-4 space-y-8 mt-6">
        
        {/* Pet Başlık */}
        <div className="flex flex-col items-center text-center space-y-3">
          {pet.avatar_url ? (
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl relative">
              <Image src={pet.avatar_url} alt={pet.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl">
              <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{pet.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{pet.name}</h1>
            <p className="text-slate-500">{pet.breed} • {pet.species}</p>
          </div>
        </div>

        {/* Acil Durum Kişileri */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center text-slate-800 dark:text-slate-200">
            <AlertCircle className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Acil Durum Kişileri
          </h2>
          <div className="rounded-xl shadow-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{owner?.full_name || 'Sahibi'}</p>
                <p className="text-sm text-slate-500">Birincil Sahip</p>
              </div>
              {owner?.phone ? (
                <a href={`tel:${owner.phone}`} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Ara
                </a>
              ) : (
                <span className="text-xs text-slate-400">Numara yok</span>
              )}
            </div>
          </div>
        </section>

        {/* Veteriner Bilgileri */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center text-slate-800 dark:text-slate-200">
            <Stethoscope className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Veteriner Bilgileri
          </h2>
          <div className="rounded-xl shadow-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-lg text-slate-900 dark:text-white">{renderField(pet.vet_name, 'Veteriner bilgisi girilmedi.')}</p>
              </div>
              {pet.vet_phone && (
                <a href={`tel:${pet.vet_phone}`} className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center">
                  Kliniği Ara
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Önemli Notlar (Beslenme, Alerjiler) */}
        <section className="space-y-4">
          <div className="rounded-xl shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
             <div className="p-5 flex items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
               <Info className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
               <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">Petinin Önemli Notları</span>
             </div>
             
             <div className="p-5 space-y-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400">Beslenme Rutini</h4>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {renderField(card.caregiver_custom_notes?.nutrition, 'Beslenme bilgisi girilmedi.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600 dark:text-red-400">Alerjiler ve Hassasiyetler</h4>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {renderField(card.caregiver_custom_notes?.allergies, 'Alerji bilgisi girilmedi.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-500">İlaçları</h4>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {renderField(card.caregiver_custom_notes?.medications, 'İlaç bilgisi girilmedi.')}
                  </p>
                </div>
             </div>
          </div>
        </section>

        {/* Seyir Defteri */}
        {card.can_log_entries && (
          <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <LogbookForm shareToken={params.token} />
          </section>
        )}

        {card.expires_at && (
          <p className="text-center text-sm text-slate-500 pt-8">
            Bu bilgilere erişiminiz {new Date(card.expires_at).toLocaleDateString('tr-TR')} tarihinde sona erecek.
          </p>
        )}

      </main>
    </div>
  )
}
