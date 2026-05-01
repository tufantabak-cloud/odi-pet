"use client"

import { useEffect, useState } from "react"
import OnboardingWizard from "./OnboardingWizard"
import ActivationChecklist from "./ActivationChecklist"

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<any>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(data => {
        setProgress(data)
        if (!data.wizard_completed) setShowWizard(true)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  const finishWizard = () => {
    setShowWizard(false)
    // Refresh onboarding progress
    fetch('/api/onboarding').then(r => r.json()).then(setProgress)
  }

  // Fail‑safe rendering
  if (loading) return <>{children}</>
  if (error) return <>{children}</>
  if (showWizard && progress) {
    return <OnboardingWizard onComplete={finishWizard} />
  }

  return (
    <>
      {/* Activation checklist appears only after wizard start */}
      {progress?.wizard_completed && <ActivationChecklist />}
      {children}
    </>
  )
}
