'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import EmptyState from '@/components/ui/EmptyState'
import { VaccineIcon, PillIcon, BowlIcon, PawIcon, HouseIcon, FirstAidIcon } from '@/components/icons/PetIcons'

// Minimalist Single-Field Modal for Frequency input
function QuickUpdateModal({ config, onClose, onDone }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.target)
    const value = fd.get(config.fields[0].name)
    
    try {
      if (config.onSaveLocal) {
        await config.onSaveLocal(value)
        onDone()
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] p-6 shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-[17px] font-extrabold text-text-primary mb-1">{config.title}</h3>
        <p className="text-[13px] text-text-secondary mb-5 leading-relaxed">{config.desc}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {config.fields.map((f: any) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">{f.label}</label>
              <select name={f.name} className="input-base py-3 text-[14px] bg-white cursor-pointer" required={f.required}>
                {f.options.map((o: any) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
          {error && <p className="text-[12px] text-error font-bold p-2 bg-error/10 rounded-lg text-center mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-[14px]">{loading ? 'Kaydediliyor...' : 'Kaydet ✓'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DashboardSmartCardsProps {
  pets: any[]
  upcomingSchedules: any[]
  completedSchedules?: any[]
}

export default function DashboardSmartCards({ pets, upcomingSchedules, completedSchedules = [] }: DashboardSmartCardsProps) {
  const router = useRouter()
  const [activeCard, setActiveCard] = useState<any>(null)
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [dismissedCards, setDismissedCards] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('odi_dismissed_smart_cards')
    if (saved) {
      try {
        setDismissedCards(JSON.parse(saved))
      } catch {
        // Safe fallback
      }
    }
  }, [])

  const dismissCard = (cardId: string) => {
    const updated = [...dismissedCards, cardId]
    setDismissedCards(updated)
    localStorage.setItem('odi_dismissed_smart_cards', JSON.stringify(updated))
  }

  // Find if there is an active DB task for parasite
  const getParasiteTask = () => {
    const now = new Date()
    now.setHours(0,0,0,0)

    return upcomingSchedules.find((s: any) => {
      const isParasite = (s.title || '').toLowerCase().includes('parazit') || 
                        (s.sub_category || '').toLowerCase().includes('parazit')
      if (!isParasite || s.status === 'done') return false
      
      const dueDate = new Date(s.due_date)
      dueDate.setHours(0,0,0,0)
      return dueDate <= now
    })
  }

  const saveParasiteFrequency = (petId: string, frequencyInMonths: number, taskId?: string) => {
    localStorage.setItem(`parasite-frequency-${petId}`, frequencyInMonths.toString())
    
    // Calculate next application date
    const nextDate = new Date()
    nextDate.setMonth(nextDate.getMonth() + Number(frequencyInMonths))
    localStorage.setItem(`parasite-next-date-${petId}`, nextDate.toISOString())

    if (taskId) {
      markTaskCompleteInDB(taskId)
    }
  }

  const markTaskCompleteInDB = async (taskId: string) => {
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase
        .from('health_schedules')
        .update({ status: 'completed' })
        .eq('id', taskId)
      router.refresh()
    } catch (err) {
      console.error('Error updating task status:', err)
    }
  }

  const handleMarkParasiteDone = (petId: string, parasiteTask?: any) => {
    const savedFrequency = localStorage.getItem(`parasite-frequency-${petId}`)

    if (!savedFrequency) {
      setQuickUpdateConfig({
        petId: petId,
        title: 'Uygulama Sıklığı',
        desc: 'Evcil hayvanınızın sağlığını korumak için dış parazit uygulamasının sıklığını belirtin.',
        fields: [{
          name: 'frequency',
          label: 'Uygulama Sıklığı',
          type: 'select',
          required: true,
          options: [
            { value: '1', label: 'Her Ay (Önerilen)' },
            { value: '2', label: '2 Ayda Bir' },
            { value: '3', label: '3 Ayda Bir' },
            { value: '6', label: '6 Ayda Bir' }
          ]
        }],
        onSaveLocal: async (value: string) => {
          saveParasiteFrequency(petId, Number(value), parasiteTask?.id)
          dismissCard(`parasite-${petId}`)
        }
      })
    } else {
      saveParasiteFrequency(petId, Number(savedFrequency), parasiteTask?.id)
      dismissCard(`parasite-${petId}`)
    }
  }

  useEffect(() => {
    if (!pets || pets.length === 0) {
      setActiveCard(null)
      return
    }

    const targetPet = pets[0]

    // ── 0. Check Deep-link Highlight parameter (Highest Priority) ───────────
    const searchParams = new URLSearchParams(window.location.search)
    const highlight = searchParams.get('highlight')

    if (highlight) {
      if (highlight.startsWith('tag-offline-')) {
        const petId = highlight.replace('tag-offline-', '')
        const pet = pets.find(p => p.id === petId) || targetPet
        setActiveCard({
          id: highlight,
          type: 'tag_offline',
          title: 'Cihaz Durumu',
          text: `${pet.name}'nın künyesi çevrimdışı.`,
          btnLabel: 'Daha Sonra',
          secondaryBtnLabel: 'Bağlantıyı Kontrol Et',
          action: () => {
            dismissCard(highlight)
            const url = new URL(window.location.href)
            url.searchParams.delete('highlight')
            window.history.replaceState({}, '', url.toString())
          },
          secondaryAction: () => {
            router.push(`/owner/devices/setup?petId=${pet.id}&type=tag`)
          }
        })
        return
      }

      if (highlight.startsWith('parasite-') || highlight.startsWith('vaccine-')) {
        const isVaccine = highlight.startsWith('vaccine-')
        const petId = isVaccine 
          ? highlight.replace('vaccine-', '') 
          : highlight.replace('parasite-', '')
        const pet = pets.find(p => p.id === petId) || targetPet
        
        if (isVaccine) {
          setActiveCard({
            id: highlight,
            type: 'vaccine',
            title: 'Aşı Uygulaması',
            text: `Bugün ${pet.name}'nın aşı/medikal işlemi var. Takvimden kontrol edebilirsiniz.`,
            btnLabel: 'Takvime Git',
            action: () => {
              router.push(`/owner/pets/${pet.id}/treatments`)
            }
          })
        } else {
          const parasiteTask = getParasiteTask()
          setActiveCard({
            id: highlight,
            type: 'parasite',
            title: 'Dış Parazit Uygulaması',
            text: `Bugün ${pet.name}'nın dış parazit uygulaması zamanı. Yaptıktan sonra işaretleyin.`,
            btnLabel: 'Uygulamayı İşaretle',
            action: () => {
              handleMarkParasiteDone(pet.id, parasiteTask)
              const url = new URL(window.location.href)
              url.searchParams.delete('highlight')
              window.history.replaceState({}, '', url.toString())
            }
          })
        }
        return
      }
    }

    // ── 1. Check Cihaz Durumu / Künye Çevrimdışı (En Yüksek Öncelik) ──────────────────
    const tagCardId = `tag-offline-${targetPet.id}`
    const showTagCard = !dismissedCards.includes(tagCardId)

    if (showTagCard) {
      setActiveCard({
        id: tagCardId,
        type: 'tag_offline',
        title: 'Cihaz Durumu',
        text: `${targetPet.name}'nın künyesi çevrimdışı.`,
        btnLabel: 'Daha Sonra',
        secondaryBtnLabel: 'Bağlantıyı Kontrol Et',
        action: () => dismissCard(tagCardId),
        secondaryAction: () => {
          router.push('/owner/devices/setup')
        }
      })
      return
    }

    // ── 2. Check Dış Parazit Card Condition ──────────────────
    const parasiteTask = getParasiteTask()
    const petIdForParasite = parasiteTask ? parasiteTask.pet_id : targetPet.id
    const parasiteCardId = `parasite-${petIdForParasite}`

    const nextParasiteDateStr = localStorage.getItem(`parasite-next-date-${petIdForParasite}`)
    let isParasiteDue = true
    if (nextParasiteDateStr) {
      const nextDate = new Date(nextParasiteDateStr)
      if (nextDate > new Date()) {
        isParasiteDue = false
      }
    }

    const showParasiteCard = isParasiteDue && !dismissedCards.includes(parasiteCardId)

    if (showParasiteCard) {
      const pet = pets.find(p => p.id === petIdForParasite) || targetPet
      setActiveCard({
        id: parasiteCardId,
        type: 'parasite',
        title: 'Dış Parazit Uygulaması',
        text: `Bugün ${pet.name}'nın dış parazit uygulaması zamanı. Yaptıktan sonra işaretleyin.`,
        btnLabel: 'Uygulamayı İşaretle',
        action: () => handleMarkParasiteDone(pet.id, parasiteTask)
      })
      return
    }

    // ── 3. Check Aşı Sonrası İştah (Appetite) Card Condition ───────────
    const recentVaccine = completedSchedules.find(s => {
      const isCompleted = s.status === 'completed' || s.status === 'done'
      const updatedDate = s.updated_at ? new Date(s.updated_at) : new Date(s.completed_at || s.due_date)
      const isRecent = updatedDate.getTime() > Date.now() - 24 * 60 * 60 * 1000
      return isCompleted && isRecent
    })

    if (recentVaccine) {
      const appetiteCardId = `appetite-${recentVaccine.id}`
      const showAppetiteCard = !dismissedCards.includes(appetiteCardId)

      if (showAppetiteCard) {
        const pet = pets.find(p => p.id === recentVaccine.pet_id) || targetPet
        setActiveCard({
          id: appetiteCardId,
          type: 'appetite',
          title: 'Aşı Sonrası Takip',
          text: `${pet.name}'nın aşısı tamamlandı. Aşı sonrası ilk 24 saat iştah takibi önemlidir. İştahını kaydetmek ister misin?`,
          btnLabel: 'İştahı Kaydet',
          action: () => {
            router.push(`/owner/pets/${pet.id}/journal/new/appetite`)
          }
        })
        return
      }
    }

    // ── 4. Check Pet Dostu Mekanlar Card Condition ───────────
    const venueCardId = `venues-${targetPet.id}`
    const showVenueCard = !dismissedCards.includes(venueCardId)

    if (showVenueCard) {
      setActiveCard({
        id: venueCardId,
        type: 'venues',
        title: 'Pet Dostu Mekanlar',
        text: `Yakınınızda ${targetPet.name} ile keyifli vakit geçirebileceğiniz mekanlar bulduk.`,
        btnLabel: 'Mekanları Keşfet',
        action: () => {
          router.push('/owner/services')
        }
      })
      return
    }

    setActiveCard(null)

  }, [pets, upcomingSchedules, dismissedCards])

  if (!activeCard) {
    return (
      <EmptyState
        icon={<FirstAidIcon width={48} height={48} />}
        title="Tüm görevleriniz tamam"
        message="Şu an için dikkat edilmesi gereken bir görev yok."
      />
    )
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'vaccine': return <VaccineIcon width={40} height={40} />
      case 'parasite': return <PillIcon width={40} height={40} />
      case 'appetite': return <BowlIcon width={40} height={40} />
      case 'venues': return <HouseIcon width={40} height={40} />
      case 'tag_offline': return <PawIcon width={40} height={40} />
      default: return <PawIcon width={40} height={40} />
    }
  }

  return (
    <div className="card-base py-4 px-5 flex flex-col gap-6 relative bg-surface border border-border-main/60 shadow-md rounded-[20px] transition-all duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          {renderIcon(activeCard.type)}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-[20px] font-semibold text-text-primary tracking-tight">
            {activeCard.title}
          </h3>
          <p className="text-[14px] text-text-secondary font-normal leading-relaxed">
            {activeCard.text}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          onClick={activeCard.action}
          className="bg-primary text-white font-semibold rounded-xl px-4 py-3 hover:bg-primary/90 active:scale-[0.98] transition-all text-[14px] flex-1 text-center shadow-sm"
        >
          {activeCard.btnLabel}
        </button>
        {activeCard.secondaryBtnLabel ? (
          <button
            onClick={activeCard.secondaryAction}
            className="text-text-secondary hover:text-text-primary text-[14px] font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all text-center border-2 border-border-main"
          >
            {activeCard.secondaryBtnLabel}
          </button>
        ) : (
          <button
            onClick={() => dismissCard(activeCard.id)}
            className="text-text-secondary hover:text-text-primary text-[14px] font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all text-center"
          >
            Daha Sonra
          </button>
        )}
      </div>

      {quickUpdateConfig && (
        <QuickUpdateModal
          config={quickUpdateConfig}
          onClose={() => setQuickUpdateConfig(null)}
          onDone={() => {
            dismissCard(activeCard.id)
            setQuickUpdateConfig(null)
          }}
        />
      )}
    </div>
  )
}
