'use client'

import React, { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Sparkles } from 'lucide-react'

interface OrchestratorPrompt {
  id: string
  component_name: string
  display_type: 'modal' | 'bottom_sheet' | 'inline_banner'
  ui_config: Record<string, unknown>
}

interface EvaluationResponse {
  success: boolean
  campaign_id?: string
  prompt?: OrchestratorPrompt
}

// Shared props interface that all orchestrator prompt components must implement
interface OrchestratorPromptComponentProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  uiConfig?: Record<string, unknown>
  displayType?: string
  petId?: string
}

// ───────────────────────────────────────────────────────────
// Component Registry — Real Bindings
// Each key maps to a dynamically imported, OPOS-compliant React component.
// Admin panel selects a component_name string; the engine renders it here.
// ───────────────────────────────────────────────────────────
const ComponentRegistry: Record<string, React.ComponentType<OrchestratorPromptComponentProps>> = {
  SmartWeightPrompt: dynamic(() => import('@/components/orchestrator/prompts/SmartWeightPrompt')),
  SmartVaccineReminder: dynamic(() => import('@/components/orchestrator/prompts/SmartVaccineReminder')),
  PremiumUpgradeBanner: dynamic(() => import('@/components/orchestrator/prompts/PremiumUpgradeBanner')),
  SmartAddressPrompt: dynamic(() => import('@/components/orchestrator/prompts/SmartAddressPrompt')),
  SmartMonthlyGrowthPrompt: dynamic(() => import('@/components/orchestrator/prompts/SmartMonthlyGrowthPrompt')),
}

interface DynamicExperienceEngineProps {
  contextTags?: string[]
  triggerEvent?: string
  petId?: string
  /** Called after the prompt is submitted, dismissed, or when no campaign matched. */
  onDone?: () => void
}

export default function DynamicExperienceEngine({
  contextTags = [],
  triggerEvent = 'on_load',
  petId,
  onDone,
}: DynamicExperienceEngineProps) {
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function evaluateRules() {
      try {
        const res = await fetch('/api/orchestrator/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contextTags, triggerEvent, petId })
        })
        const data: EvaluationResponse = await res.json()
        if (data.success && data.prompt) {
          setEvaluation(data)
          setOpen(true)
        } else {
          // No matching campaign — immediately signal done so caller can proceed
          onDone?.()
        }
      } catch (error) {
        console.error('[Experience Engine] Evaluation failed:', error)
        // On error, don't block the caller
        onDone?.()
      } finally {
        setLoading(false)
      }
    }

    evaluateRules()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerEvent])

  if (loading || !evaluation?.prompt || !open) return null

  const { prompt } = evaluation
  const TargetComponent = ComponentRegistry[prompt.component_name]

  if (!TargetComponent) {
    console.warn(`[Experience Engine] Component "${prompt.component_name}" not found in registry.`)
    onDone?.()
    return null
  }

  // Handle the submission securely — only prompt_id is sent, never the mutation_action
  const handleSubmit = async (payload: Record<string, unknown>) => {
    // ONEMLI: Hatalar YUTULMAZ, cagiran bilesene firlatilir.
    // Prompt bilesenleri kota (403 gallery_quota_exceeded) gibi hatalarda kullaniciya
    // mesaj gosterip yukledikleri yetim dosyayi temizleyebilmelidir.
    const res = await fetch('/api/orchestrator/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt_id: prompt.id,
        payload,
        pet_id: petId
      })
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data?.success) {
      const err = new Error(data?.error || 'submit_failed') as Error & { status?: number }
      err.status = res.status
      console.error('[Experience Engine] Submit failed:', res.status, data?.error)
      throw err
    }

    setOpen(false)
    onDone?.()
  }

  const handleClose = async () => {
    // Log 'dismissed' event for analytics funnel
    try {
      await fetch('/api/orchestrator/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: prompt.id,
          payload: { _event: 'dismissed' },
          pet_id: petId
        })
      })
    } catch { /* analytics failure should not block UX */ }
    setOpen(false)
    onDone?.()
  }

  return (
    <Suspense fallback={null}>
      {/* OPOS Cilt 13: AI-generated content must be clearly marked with Sparkles indicator */}
      {Boolean(prompt.ui_config?.is_ai_generated) && (
        <div className="fixed top-4 right-4 z-[60] flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full shadow-sm">
          <Sparkles size={14} className="text-purple-600" />
          <span className="text-xs font-semibold text-purple-700">AI Önerisi</span>
        </div>
      )}

      <TargetComponent
        open={open}
        onClose={handleClose}
        onSubmit={handleSubmit}
        uiConfig={prompt.ui_config}
        displayType={prompt.display_type}
        petId={petId}
      />
    </Suspense>
  )
}
