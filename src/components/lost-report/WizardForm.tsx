'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { LocationForm } from './LocationForm'
import { OTPVerification } from './OTPVerification'
import { PetSelection } from './PetSelection'
import { PhotoUpload } from './PhotoUpload'
import { ProgressBar } from './ProgressBar'
import { PublishSummary } from './PublishSummary'

type PetOption = {
  id: string
  name: string
  species: string | null
}

export function WizardForm({ pets }: { pets: PetOption[] }) {
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
      const response = await fetch('/api/v1/reports/lost/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          payload: updatedPayload,
          action: 'save_draft',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'DRAFT_SAVE_FAILED')
      }

      setPayload(updatedPayload)
      setStep(nextStep)
    } catch {
      setError('Bilgiler kaydedilemedi. Lütfen tekrar dene.')
    } finally {
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
      <ProgressBar currentStep={step} totalSteps={5} />

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
            onNext={(contactPhone) =>
              void saveDraftAndAdvance({ contactPhone }, 5)
            }
          />
        )}
        {step === 5 && (
          <PublishSummary
            sessionId={sessionId}
            payload={payload}
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
