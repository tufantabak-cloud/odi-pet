"use client"

import { useEffect, useState } from "react"
import OnboardingWizard from "./OnboardingWizard"

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<any>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const isTestDisabled = typeof window !== 'undefined' && window.localStorage.getItem('onboarding_disabled') === 'true';
    if (process.env.NEXT_PUBLIC_ONBOARDING_ENABLED === 'false' || isTestDisabled) {
      setLoading(false)
      return;
    }

    fetch('/api/onboarding')
      .then(async r => {
        if (!r.ok) {
          const text = await r.text();
          console.error('OnboardingGate API error text:', text);
          throw new Error('API failed');
        }
        return r.json();
      })
      .then(data => {
        setProgress(data)
        if (!data.wizard_completed) setShowWizard(true)
        setLoading(false)
      })
      .catch((e) => {
        console.error('OnboardingGate fetch caught error:', e);
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
    return (
      <>
        {children}
        <OnboardingWizard onComplete={finishWizard} />
      </>
    )
  }

  return <>{children}</>
}
