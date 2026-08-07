'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import dynamic from 'next/dynamic'

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

  if (reportId) {
    return (
      <div className="card-base mx-auto w-full max-w-md p-6 text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">✅</div>
        <h2 className="mb-2 text-2xl font-bold text-green-700">İlan yayınlandı</h2>
        <p className="mb-4 text-gray-600">
          Kayıp ilanı aktif edildi ve sosyal kayıp pet akışında görünür durumda.
        </p>
        <p className="inline-block rounded bg-gray-100 p-2 font-mono text-sm text-gray-500">
          ID: {reportId}
        </p>
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
            onNext={(photo) => void saveDraftAndAdvance({ photo }, 3)}
          />
        )}
        {step === 3 && (
          <LocationForm
            onNext={(location) => void saveDraftAndAdvance({ location }, 4)}
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
