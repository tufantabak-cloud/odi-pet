'use client'

import React, { useState } from 'react'
import FormModal from '@/components/ui/FormModal'
import Input from '@/components/ui/primitives/Input'
import Button from '@/components/ui/primitives/Button'

interface SmartWeightPromptProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  uiConfig?: Record<string, unknown>
  displayType?: string
}

export default function SmartWeightPrompt({
  open,
  onClose,
  onSubmit,
  uiConfig,
}: SmartWeightPromptProps) {
  const [weight, setWeight] = useState('')
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericWeight = parseFloat(weight.replace(',', '.'))
    if (isNaN(numericWeight) || numericWeight <= 0) {
      setError('Geçerli bir kilo değeri girin.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onSubmit({ weight: numericWeight, measured_at: measuredAt })
      setWeight('')
    } catch {
      setError('Kayıt sırasında bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      open={open}
      title={(uiConfig?.title as string) || 'Kilo Kaydı'}
      description={(uiConfig?.description as string) || 'Evcil hayvanınızın güncel kilosunu kaydedin.'}
      icon="⚖️"
      iconBg="bg-blue-100"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Kilo (kg)"
          type="text"
          inputMode="decimal"
          placeholder="Örn: 4.5"
          value={weight}
          onChange={(e) => { setWeight(e.target.value); setError(null) }}
          required
        />
        <Input
          label="Ölçüm Tarihi"
          type="date"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
        />

        {error && (
          <div className="p-3 bg-danger-soft text-danger text-sm font-medium rounded-xl">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose} fullWidth>İptal</Button>
          <Button variant="primary" type="submit" isLoading={loading} fullWidth>Kaydet</Button>
        </div>
      </form>
    </FormModal>
  )
}
