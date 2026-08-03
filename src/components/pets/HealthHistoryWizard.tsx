'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface VaccineAnswer {
  vaccine_code: string
  vaccine_name: string
  category: string
  dose_count: number
  recurrence_days: number | null
  has_annual_booster: boolean
  answer: 'yes' | 'ask_vet' | 'no_or_unknown'
  user_date?: string | null
  is_approximate?: boolean
}

export default function HealthHistoryWizard({ pet, templates }: { pet: any, templates: any[] }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<VaccineAnswer[]>([])
  
  // State for current active step
  const [currentChoice, setCurrentChoice] = useState<'yes' | 'no_or_unknown' | null>(null)
  const [userDate, setUserDate] = useState<string>('')
  const [vetReminder, setVetReminder] = useState(false)
  const [approximate, setApproximate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  const template = templates[currentStep]
  const totalSteps = templates.length

  const handleNext = async () => {
    // Current cevabı kaydet
    let finalAnswer: 'yes' | 'ask_vet' | 'no_or_unknown' = 'no_or_unknown'
    let finalDate: string | null = null
    let finalApproximate = false

    if (currentChoice === 'yes') {
      if (vetReminder) {
        finalAnswer = 'ask_vet'
      } else {
        finalAnswer = 'yes'
        finalDate = userDate || null
        finalApproximate = approximate
      }
    } else {
      finalAnswer = 'no_or_unknown'
    }

    const newAnswer: VaccineAnswer = {
      vaccine_code: template.vaccine_code,
      vaccine_name: template.vaccine_name,
      category: template.category,
      dose_count: template.dose_count,
      recurrence_days: template.recurrence_days,
      has_annual_booster: template.has_annual_booster,
      answer: finalAnswer,
      user_date: finalDate,
      is_approximate: finalApproximate
    }

    const newAnswers = [...answers]
    newAnswers[currentStep] = newAnswer
    setAnswers(newAnswers)

    if (currentStep < totalSteps - 1) {
      // Bir sonraki aşamaya geç, state'leri sıfırla
      setCurrentStep(prev => prev + 1)
      
      const nextAns = newAnswers[currentStep + 1]
      if (nextAns) {
        setCurrentChoice(nextAns.answer === 'ask_vet' ? 'yes' : nextAns.answer === 'yes' ? 'yes' : nextAns.answer === 'no_or_unknown' ? 'no_or_unknown' : null)
        setVetReminder(nextAns.answer === 'ask_vet')
        setApproximate(nextAns.is_approximate || false)
        setUserDate(nextAns.user_date || '')
      } else {
        setCurrentChoice(null)
        setUserDate('')
        setVetReminder(false)
        setApproximate(false)
      }
    } else {
      // Son aşama, API'ye gönder
      setIsSubmitting(true)
      try {
        const payload = [...newAnswers]
        // Parazitleri frontend'den boş olarak göndermeye gerek yok, API otomatik algılıyor ve oluşturuyor.
        // Ama yine de API'nin tetiklemesi için boş bir payload gitmesinde sakınca yok.
        // API kendisi category === 'parasite' ise handle ediyor.

        const res = await fetch(`/api/pets/${pet.id}/health-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vaccine_answers: payload })
        })

        if (!res.ok) throw new Error('API request failed')
        
        setIsFinished(true)
      } catch (err) {
        console.error('Error submitting health history', err)
        alert('Bir hata oluştu, lütfen tekrar deneyin.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      const prevAns = answers[currentStep - 1]
      setCurrentChoice(prevAns.answer === 'ask_vet' ? 'yes' : prevAns.answer === 'yes' ? 'yes' : prevAns.answer === 'no_or_unknown' ? 'no_or_unknown' : null)
      setVetReminder(prevAns.answer === 'ask_vet')
      setApproximate(prevAns.is_approximate || false)
      setUserDate(prevAns.user_date || '')
    }
  }

  if (isFinished) {
    return (
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-input overflow-hidden mb-6">
        <div className="p-5">
          <div className="text-center mb-4 pb-4 border-b border-[var(--color-border)]">
            <div className="w-12 h-12 rounded-full bg-[var(--color-bg-success)] flex items-center justify-center mx-auto mb-2">
              <i className="ti ti-rosette text-[22px] text-[var(--color-text-success)]" />
            </div>
            <p className="text-base font-bold text-[var(--color-text-primary)]">Sağlık geçmişi tamamlandı</p>
            <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">Bundan sonra her şey otomatik — hatırlatıcılar doğru tarihlerde gelecek.</p>
            <div className="inline-flex items-center gap-1.5 bg-[var(--color-bg-success)] text-[var(--color-text-success)] border border-[var(--color-text-success)]/20 rounded-lg px-3 py-1.5 text-[12px] font-bold mt-3">
              <i className="ti ti-star text-[14px]" /> +50 puan kazandınız
            </div>
          </div>
          
          <button 
            onClick={() => router.push(`/owner/pets/${pet.id}`)}
            className="w-full bg-[var(--color-primary)] text-white border-none rounded-lg py-3 text-[14px] font-bold cursor-pointer hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Profile Dön
          </button>
        </div>
      </div>
    )
  }

  if (!template) return null

  const progress = ((currentStep) / totalSteps) * 100

  return (
    <div className="mb-6">
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-input overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Aşı {currentStep + 1} / {totalSteps}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">Sadece bir kez yapılır</p>
          </div>
          <div className="h-1 bg-[var(--color-surface-0)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--color-border)]">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-accent)] flex items-center justify-center shrink-0">
              <i className="ti ti-needle text-[18px] text-[var(--color-text-accent)]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[var(--color-text-primary)]">{template.vaccine_name}</p>
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                {template.dose_count > 1 ? `${template.dose_count} doz serisi` : 'Tek doz'}
                {template.has_annual_booster ? ' · yıllık tekrar gerekli' : ''}
              </p>
            </div>
          </div>

          <p className="text-[13px] font-bold text-[var(--color-text-primary)] mb-2">
            {pet.name} bu aşıyı yaptırdı mı?
          </p>

          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => { setCurrentChoice('yes'); setVetReminder(false); setApproximate(false); }}
              className={`flex-1 py-2.5 px-2 text-[13px] font-600 border rounded-lg transition-colors ${currentChoice === 'yes' ? 'bg-[var(--color-bg-accent)] border-[var(--color-border-accent)] text-[var(--color-text-accent)]' : 'bg-transparent border-[var(--color-border-strong)] text-[var(--color-text-primary)]'}`}
            >
              Evet, yaptırdım
            </button>
            <button 
              onClick={() => { setCurrentChoice('no_or_unknown'); setUserDate(''); setVetReminder(false); setApproximate(false); }}
              className={`flex-1 py-2.5 px-2 text-[13px] font-600 border rounded-lg transition-colors ${currentChoice === 'no_or_unknown' ? 'bg-[var(--color-bg-warning)] border-[var(--color-border-warning)] text-[var(--color-text-warning)]' : 'bg-transparent border-[var(--color-border-strong)] text-[var(--color-text-primary)]'}`}
            >
              Hayır / bilmiyorum
            </button>
          </div>

          {currentChoice === 'yes' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-2">Son yapılan tarihi biliyor musunuz?</p>
              <div className="flex gap-2 items-center flex-wrap mb-2">
                <input 
                  type="date" 
                  value={userDate}
                  onChange={(e) => { setUserDate(e.target.value); setApproximate(false); setVetReminder(false); }}
                  className="flex-1 min-w-[150px] text-[13px] p-2 border border-[var(--color-border-strong)] rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                <button 
                  onClick={() => { setVetReminder(true); setUserDate(''); setApproximate(false); }}
                  className={`text-[12px] px-2.5 py-1.5 border rounded-lg flex items-center gap-1 transition-colors ${vetReminder ? 'bg-[var(--color-surface-2)] border-[var(--color-border-strong)] text-[var(--color-text-primary)] shadow-sm' : 'bg-[var(--color-surface-1)] border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
                >
                  <i className="ti ti-stethoscope text-[13px]" /> Veterinere soracağım
                </button>
                <button 
                  onClick={() => { setApproximate(true); setUserDate(''); setVetReminder(false); }}
                  className={`text-[12px] px-2.5 py-1.5 bg-transparent border-none text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors ${approximate ? 'font-bold text-[var(--color-text-primary)]' : ''}`}
                >
                  Hatırlamıyorum
                </button>
              </div>

              {userDate && !vetReminder && !approximate && (
                <div className="p-2 rounded-lg text-[12px] bg-[var(--color-bg-success)] text-[var(--color-text-success)] mb-2 animate-in fade-in">
                  ✓ Tarih kaydedildi. Gelecek tekrarı bu tarihe göre planlanacak.
                </div>
              )}
              {vetReminder && (
                <div className="p-2 rounded-lg text-[12px] bg-[var(--color-bg-warning)] text-[var(--color-text-warning)] mb-2 animate-in fade-in">
                  1 hafta sonraya "Karnemi veterinere sor" hatırlatması eklenecek.
                </div>
              )}
              {approximate && (
                <div className="p-2 rounded-lg text-[12px] bg-[var(--color-surface-1)] border border-[var(--color-border)] text-[var(--color-text-secondary)] mb-2 animate-in fade-in">
                  Tarih bilinmiyor — bugün + 1 yıl olarak atanacak. Sonradan düzenleyebilirsiniz.
                </div>
              )}
            </div>
          )}

          {currentChoice === 'no_or_unknown' && (
            <div className="p-2 rounded-lg text-[12px] bg-[var(--color-surface-1)] border border-[var(--color-border)] text-[var(--color-text-secondary)] mb-2 animate-in fade-in flex items-start gap-1.5">
              <i className="ti ti-info-circle text-[14px] shrink-0 mt-0.5" />
              Tüm doz serisi bugünden başlatılarak planlanacak. Veteriner ziyareti önerilir.
            </div>
          )}

          {currentChoice && (
            <div className="flex justify-between items-center border-t border-[var(--color-border)] pt-4 mt-2">
              <button 
                onClick={handlePrev}
                disabled={currentStep === 0 || isSubmitting}
                className={`text-[13px] font-bold bg-transparent border-none p-2 ${currentStep === 0 ? 'text-[var(--color-text-muted)] cursor-not-allowed' : 'text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)]'}`}
              >
                ← Geri
              </button>
              <button 
                onClick={handleNext}
                disabled={isSubmitting || (currentChoice === 'yes' && !userDate && !vetReminder && !approximate)}
                className="bg-[var(--color-primary)] text-white border-none rounded-lg px-5 py-2 text-[13px] font-bold cursor-pointer hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Kaydediliyor...' : (currentStep === totalSteps - 1 ? 'Tamamla ✓' : 'Sonraki aşı →')}
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-[12px] text-[var(--color-text-muted)] text-center mt-3">
        Parazitler için tarih sorulmaz — her zaman bugünden başlatılır.
      </p>
    </div>
  )
}
