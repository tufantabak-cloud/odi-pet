'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { CheckCircle2, Sparkles } from 'lucide-react'

import { OTPVerification } from './OTPVerification'
import { PetSelection } from './PetSelection'
import { PhotoUpload } from './PhotoUpload'
import { ProgressBar } from './ProgressBar'
import { PublishSummary } from './PublishSummary'

const LocationForm = dynamic(
  () => import('./LocationForm').then((mod) => mod.LocationForm),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-600">Harita yükleniyor…</p>
      </div>
    ),
  }
)

type PetOption = {
  id: string
  name: string
  species: string | null
  avatar_url?: string | null
  microchip_no?: string | null
  passport_no?: string | null
  registration_city?: string | null
  registration_district?: string | null
  agriculture_directorate?: string | null
}

export function WizardForm({
  pets,
  userPhone,
  isPhoneConfirmed,
}: {
  pets: PetOption[]
  userPhone?: string
  isPhoneConfirmed?: boolean
}) {
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState('')
  const [payload, setPayload] = useState<Record<string, unknown>>({})
  const [reportId, setReportId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSessionId(crypto.randomUUID())
  }, [])

  const saveDraftAndAdvance = async (
    newData: Record<string, unknown>,
    nextStep: number
  ) => {
    if (!sessionId) return

    setSaving(true)
    setError('')
    const updatedPayload = { ...payload, ...newData }

    try {
      await fetch('/api/v1/reports/lost/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          payload: updatedPayload,
          action: 'save_draft',
        }),
      })
    } catch (err) {
      console.warn('Draft sync warning, continuing locally:', err)
    } finally {
      setPayload(updatedPayload)
      setStep(nextStep)
      setSaving(false)
    }
  }

  if (pets.length === 0) {
    return (
      <div className="card-base mx-auto w-full max-w-md p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Önce bir pet profili gerekli</h2>
        <p className="mt-2 text-sm text-gray-600">
          Kayıp ilanının doğru petle ve sahiplik kaydıyla eşleşmesi için profil oluşturmalısın.
        </p>
        <Link href="/owner/pets/add" className="btn-primary mt-5 inline-flex px-5 py-3">
          Pet Profili Oluştur
        </Link>
      </div>
    )
  }

  const currentPet = pets.find((p) => p.id === payload.petId) || pets[0]

  if (reportId) {
    return (
      <div className="card-base mx-auto w-full max-w-md p-6 text-center flex flex-col gap-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-10 h-10" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kayıp İlanı Yayında!</h2>
          <p className="mt-1 text-sm text-slate-600">
            Kayıp ihbarınız aktif edildi ve sosyal kayıp pet akışında tüm kullanıcılara ve haritaya duyuruldu.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono text-slate-500">
          İlan Referans No: {reportId}
        </div>

        {!currentPet?.microchip_no && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-left flex flex-col gap-2">
            <div className="flex items-center gap-2 text-purple-800 font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Bulan Kliniklerin Size Ulaşmasını Kolaylaştırın</span>
            </div>
            <p className="text-xs text-purple-700 leading-relaxed">
              Petinizi bulan bir veteriner hekim veya barınak mikroçip taraması yaptığında doğrudan size ulaşabilmesi için mikroçip numaranızı ekleyebilirsiniz.
            </p>
            {currentPet?.id && (
              <Link
                href={`/owner/pets/${currentPet.id}`}
                className="mt-1 inline-flex items-center justify-center gap-1.5 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              >
                Profile Mikroçip Ekle
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2">
          <Link
            href="/owner/pets"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          >
            Petlerime Dön
          </Link>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="card-base mx-auto w-full max-w-md p-6 text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">⏳</div>
        <h2 className="mb-2 text-2xl font-bold text-amber-600">İlan Beklemeye Alındı</h2>
        <p className="mb-4 text-gray-600">
          Kayıp ihbarı bilgileriniz taslak olarak güvenle kaydedildi. Eksik resmi kayıt bilgilerinizi dilediğiniz zaman tamamlayarak ilanınızı yayına alabilirsiniz.
        </p>
        <div className="flex flex-col gap-2 mt-6">
          <button
            type="button"
            onClick={() => setIsPending(false)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
          >
            Bilgileri Şimdi Tamamla
          </button>
          <Link
            href="/owner/pets"
            className="w-full py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Petlerime Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="card-base mx-auto w-full max-w-md p-6">
      <ProgressBar currentStep={step} totalSteps={5} onBack={() => setStep(step - 1)} />

      <div className="min-h-[300px]">
        {step === 1 && (
          <PetSelection
            pets={pets}
            onNext={(petId) => void saveDraftAndAdvance({ petId }, 2)}
          />
        )}
        {step === 2 && (
          <PhotoUpload
            sessionId={sessionId}
            defaultPhotoUrl={pets.find((p) => p.id === payload.petId)?.avatar_url}
            petName={pets.find((p) => p.id === payload.petId)?.name}
            onNext={(photo) => void saveDraftAndAdvance({ 
              photo, 
              additionalPhotos: photo.additionalPhotos 
            }, 3)}
          />
        )}
        {step === 3 && (
          <LocationForm
            onNext={(location) => void saveDraftAndAdvance({ 
              location,
              color: location.color,
              collarInfo: location.collarInfo,
              distinctiveFeatures: location.distinctiveFeatures
            }, 4)}
          />
        )}
        {step === 4 && (
          <OTPVerification
            userPhone={userPhone}
            isPhoneConfirmed={isPhoneConfirmed}
            onNext={(contactPhone) =>
              void saveDraftAndAdvance({ contactPhone }, 5)
            }
          />
        )}
        {step === 5 && (
          <PublishSummary
            sessionId={sessionId}
            payload={payload}
            selectedPet={pets.find((p) => p.id === payload.petId) || pets[0]}
            onPublish={setReportId}
            onPending={() => setIsPending(true)}
          />
        )}
      </div>

      {(saving || error) && (
        <div
          className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
            error
              ? 'bg-red-50 text-red-700'
              : 'bg-primary/5 text-primary'
          }`}
          role={error ? 'alert' : 'status'}
        >
          {error || 'Bilgilerin güvenle kaydediliyor…'}
        </div>
      )}
    </div>
  )
}
