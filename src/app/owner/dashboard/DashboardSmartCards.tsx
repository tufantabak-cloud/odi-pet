'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { VaccineIcon, PillIcon, BowlIcon, PawIcon, HouseIcon } from '@/components/icons/PetIcons'
import QuickJournalWidget from '@/components/dashboard/QuickJournalWidget'

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
    <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-modal p-6 shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
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
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-btn border-2 border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary py-3.5 disabled:opacity-50 shadow-sm text-[14px]">{loading ? 'Kaydediliyor...' : 'Kaydet ✓'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DashboardSmartCardsProps {
  pets: any[]
  activePetId: string
  upcomingSchedules: any[]
  completedSchedules?: any[]
  allWeightLogs?: any[]
  journalEntries?: any[]
}

export default function DashboardSmartCards({ pets, activePetId, upcomingSchedules, completedSchedules = [], allWeightLogs = [], journalEntries = [] }: DashboardSmartCardsProps) {
  const router = useRouter()
  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [dismissedCards, setDismissedCards] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)

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
      if (taskId.startsWith('plan_')) {
        const realId = taskId.replace('plan_', '')
        await fetch(`/api/plans/${realId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        })
      } else {
        const supabase = createBrowserSupabaseClient()
        await supabase
          .from('health_schedules')
          .update({ status: 'completed' })
          .eq('id', taskId)
      }
      router.refresh()
    } catch (err) {
      console.error('Error updating task status:', err)
    }
  }

  const handleMarkParasiteDone = (petId: string, parasiteTask: any, cardId: string) => {
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
          dismissCard(cardId)
        }
      })
    } else {
      saveParasiteFrequency(petId, Number(savedFrequency), parasiteTask?.id)
      dismissCard(cardId)
    }
  }

  // Collect active cards based on conditions in priority order
  const activeCards: any[] = []
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const highlight = searchParams ? searchParams.get('highlight') : null

  if (pets && pets.length > 0) {
    const targetPet = pets.find(p => p.id === activePetId) || pets[0]

    // 1. Highlight Deep-link Card
    let highlightCard: any = null
    if (highlight) {
      if (highlight.startsWith('vaccine-') || highlight.startsWith('parasite-')) {
        const isVaccine = highlight.startsWith('vaccine-')
        const petId = isVaccine ? highlight.replace('vaccine-', '') : highlight.replace('parasite-', '')
        const pet = pets.find(p => p.id === petId) || targetPet

        if (isVaccine) {
          highlightCard = {
            id: highlight,
            type: 'vaccine',
            title: 'Aşı Uygulaması',
            subtitle: `Bugün ${pet.name}'nın aşı/medikal işlemi var. Takvimden kontrol edebilirsiniz.`,
            ctaLabel: 'Takvime Git',
            action: () => {
              router.push(`/owner/pets/${pet.id}/vaccines`)
            }
          }
        } else {
          const parasiteTask = getParasiteTask()
          const nextParasiteDateStr = typeof window !== 'undefined' ? localStorage.getItem(`parasite-next-date-${pet.id}`) : null
          const cardId = parasiteTask ? `parasite-task-${parasiteTask.id}` : `parasite-local-${pet.id}-${nextParasiteDateStr || 'init'}`
          highlightCard = {
            id: highlight,
            type: 'parasite',
            title: 'Dış Parazit Uygulaması',
            subtitle: `Bugün ${pet.name}'nın dış parazit uygulaması zamanı. Yaptıktan sonra işaretleyin.`,
            ctaLabel: 'Uygulamayı İşaretle',
            action: () => {
              handleMarkParasiteDone(pet.id, parasiteTask, cardId)
              const url = new URL(window.location.href)
              url.searchParams.delete('highlight')
              window.history.replaceState({}, '', url.toString())
            }
          }
        }
      }
    }

    if (highlightCard) {
      activeCards.push(highlightCard)
    }

    // Günü Gelmiş/Geçmiş Aşı Kontrolü
    const todayDate = new Date()
    todayDate.setHours(0,0,0,0)

    const overdueVaccine = upcomingSchedules?.find((s: any) => {
      const isVaccineTask = (s.title || '').toLowerCase().includes('aşı') || 
                            (s.sub_category || '').toLowerCase().includes('aşı') ||
                            s.vaccines
      if (!isVaccineTask || s.status === 'done') return false
      
      const dueDate = new Date(s.due_date)
      dueDate.setHours(0,0,0,0)
      return dueDate <= todayDate
    })

    if (overdueVaccine) {
      const vaccineCardId = `vaccine-${overdueVaccine.id}`
      const isAlreadyHighlighted = highlightCard?.id === highlight && highlight?.startsWith('vaccine-')
      if (!dismissedCards.includes(vaccineCardId) && highlight !== vaccineCardId && !isAlreadyHighlighted) {
        const pet = pets.find(p => p.id === overdueVaccine.pet_id) || targetPet
        activeCards.push({
          id: vaccineCardId,
          type: 'vaccine',
          title: 'Aşı Uygulaması',
          subtitle: `Bugün ${pet.name}'nın aşı/medikal işlemi var. Takvimden kontrol edebilirsiniz.`,
          ctaLabel: 'Takvime Git',
          action: () => {
            router.push(`/owner/pets/${pet.id}/vaccines`)
          }
        })
      }
    }

    // Bugün vadesi gelmiş/geçmiş sağlık görevleri (aşı/parazit harici ve aktif pet'e ait)
    const todayHealthTasks = upcomingSchedules?.filter((s: any) => {
      if (s.pet_id !== targetPet.id) return false
      if (s.status === 'done') return false
      const isHealth = s.category === 'saglik' || s.category === 'Saglik'
      if (!isHealth) return false
      if (!s.due_date) return false
      const dueDate = new Date(s.due_date)
      dueDate.setHours(0,0,0,0)
      return dueDate <= todayDate
    })

    if (todayHealthTasks && todayHealthTasks.length > 0) {
      const healthCardId = `health-tasks-${targetPet.id}-${todayDate.toISOString().split('T')[0]}`
      if (!dismissedCards.includes(healthCardId) && highlight !== healthCardId) {
        const pet = pets.find(p => p.id === todayHealthTasks[0].pet_id) || targetPet
        const taskCount = todayHealthTasks.length
        const firstTask = todayHealthTasks[0]
        const taskTitle = firstTask.title || firstTask.sub_category || 'Sağlık Görevi'
        activeCards.push({
          id: healthCardId,
          type: 'health-task',
          title: taskCount === 1 ? taskTitle : `${taskCount} Sağlık Görevi Bekliyor`,
          subtitle: taskCount === 1
            ? `${pet.name}'nın bugün için planlanmış ${taskTitle} görevi var.`
            : `${pet.name}'nın bugün için ${todayHealthTasks.map((t: any) => t.title || t.sub_category).slice(0, 3).join(', ')} ve daha fazlası planlandı.`,
          ctaLabel: 'Görüntüle',
          action: () => {
            router.push(`/owner/pets/${pet.id}?tab=saglik#section-saglik`)
          }
        })
      }
    }

    // Calculate weight statistics
    const lastWeightLog = allWeightLogs?.find(w => w.pet_id === targetPet.id)
    const daysSinceLastLog = lastWeightLog 
      ? Math.floor((Date.now() - new Date(lastWeightLog.measured_at).getTime()) / 86400000)
      : null

    const isFirstEntry = !lastWeightLog
    const isRoutineDue = lastWeightLog && daysSinceLastLog !== null && daysSinceLastLog >= 30

    // 2. Kilo İlk Giriş (Profil Eksik)
    const weightFirstCardId = `weight-first-${targetPet.id}`
    if (isFirstEntry && !dismissedCards.includes(weightFirstCardId) && highlight !== weightFirstCardId) {
      activeCards.push({
        id: weightFirstCardId,
        type: 'weight-first',
        title: 'Kilo & Boy Bilgisi Eksik',
        subtitle: `${targetPet.name}'in profilini tamamla`,
        ctaLabel: 'Gir',
        action: () => {
          router.push(`/owner/pets/${targetPet.id}/journal/new/weight`)
        }
      })
    }

    // 3. Dış Parazit Card (Rutin Sağlık)
    const parasiteTask = getParasiteTask()
    const petIdForParasite = parasiteTask ? parasiteTask.pet_id : targetPet.id
    const nextParasiteDateStr = typeof window !== 'undefined' ? localStorage.getItem(`parasite-next-date-${petIdForParasite}`) : null
    let isParasiteDue = false
    
    if (parasiteTask) {
      isParasiteDue = true
    } else if (nextParasiteDateStr) {
      const nextDate = new Date(nextParasiteDateStr)
      if (nextDate <= new Date()) {
        isParasiteDue = true
      }
    }

    const parasiteCardId = parasiteTask ? `parasite-task-${parasiteTask.id}` : `parasite-local-${petIdForParasite}-${nextParasiteDateStr || 'init'}`
    const showParasiteCard = isParasiteDue && !dismissedCards.includes(parasiteCardId) && highlight !== parasiteCardId

    if (showParasiteCard) {
      const pet = pets.find(p => p.id === petIdForParasite) || targetPet
      activeCards.push({
        id: parasiteCardId,
        type: 'parasite',
        title: 'Dış Parazit Uygulaması',
        subtitle: `Bugün ${pet.name}'nın dış parazit uygulaması zamanı. Yaptıktan sonra işaretleyin.`,
        ctaLabel: 'İşaretle',
        action: () => handleMarkParasiteDone(pet.id, parasiteTask, parasiteCardId)
      })
    }

    // 4. Aşı Sonrası İştah (Takip)
    const recentVaccine = completedSchedules.find(s => {
      const isCompleted = s.status === 'completed' || s.status === 'done'
      const updatedDate = s.updated_at ? new Date(s.updated_at) : new Date(s.completed_at || s.due_date)
      const isRecent = updatedDate.getTime() > Date.now() - 24 * 60 * 60 * 1000
      return isCompleted && isRecent
    })

    if (recentVaccine) {
      const appetiteCardId = `appetite-${recentVaccine.id}`
      const showAppetiteCard = !dismissedCards.includes(appetiteCardId) && highlight !== appetiteCardId

      if (showAppetiteCard) {
        const pet = pets.find(p => p.id === recentVaccine.pet_id) || targetPet
        activeCards.push({
          id: appetiteCardId,
          type: 'appetite',
          title: 'Aşı Sonrası Takip',
          subtitle: `${pet.name}'nın aşısı tamamlandı. Aşı sonrası ilk 24 saat iştah takibi önemlidir. İştahını kaydetmek ister misin?`,
          ctaLabel: 'İştahı Kaydet',
          action: () => {
            router.push(`/owner/pets/${pet.id}/journal/new/appetite`)
          }
        })
      }
    }

    // 5. Kilo Rutin Zamanı (Aylık)
    const weightRoutineCardId = `weight-routine-${targetPet.id}`
    if (isRoutineDue && !dismissedCards.includes(weightRoutineCardId) && highlight !== weightRoutineCardId) {
      activeCards.push({
        id: weightRoutineCardId,
        type: 'weight-routine',
        title: 'Aylık Kilo Kontrolü',
        subtitle: `Son ölçüm: ${daysSinceLastLog} gün önce — güncelle`,
        ctaLabel: 'Güncelle',
        action: () => {
          router.push(`/owner/pets/${targetPet.id}/journal/new/weight`)
        }
      })
    }

    // 5.5. Journal Card (Sağlık Günlüğü eksik ise)
    function getLocalDateStr(date = new Date()) {
      const offset = date.getTimezoneOffset()
      const local = new Date(date.getTime() - offset * 60000)
      return local.toISOString().split('T')[0]
    }

    const todayStr = getLocalDateStr()
    const hasTodayEntry = journalEntries?.some(e => {
      if (e.pet_id !== targetPet.id) return false
      const entryDateStr = getLocalDateStr(new Date(e.created_at))
      return entryDateStr === todayStr
    })
    const journalCardId = `journal-${targetPet.id}`

    if (!hasTodayEntry && !dismissedCards.includes(journalCardId) && highlight !== journalCardId) {
      activeCards.push({
        id: journalCardId,
        type: 'journal',
        title: `${targetPet.name} Bugün Nasıl Hissediyor?`,
        subtitle: `${targetPet.name}'in günlük iştah ve ruh halini kaydet`,
        ctaLabel: 'Kaydet',
        action: () => {
          setQuickUpdateConfig({
            petId: targetPet.id,
            type: 'journal',
            title: 'Sağlık Günlüğü',
            desc: `${targetPet.name}'in günlük durumunu kaydedin.`
          })
        }
      })
    }

    // 6. Pet Dostu Mekanlar (Yaşam - Fallback)
    const venueCardId = `venues-${targetPet.id}`
    const showVenueCard = !dismissedCards.includes(venueCardId) && highlight !== venueCardId
    const hasOtherRealCards = activeCards.length > 0

    if (showVenueCard && !hasOtherRealCards) {
      activeCards.push({
        id: venueCardId,
        type: 'venues',
        title: 'Pet Dostu Mekanlar',
        subtitle: `Yakınınızda ${targetPet.name} ile keyifli vakit geçirebileceğiniz mekanlar bulduk.`,
        ctaLabel: 'Keşfet',
        action: () => {
          router.push('/owner/services')
        }
      })
    }
  }

  // Already pushed in exact priority order
  const sorted = activeCards

  if (sorted.length === 0) {
    return (
      <div className="mx-[var(--space-4)] rounded-2xl border border-dashed border-[var(--color-border)] py-4 text-center">
        <span className="text-[11px] font-600 text-[var(--color-text-muted)]">
          Bugün için aktif görev yok 🎉
        </span>
      </div>
    )
  }

  const visibleCards = expanded ? sorted : sorted.slice(0, 2)

  const renderIcon = (type: string) => {
    switch (type) {
      case 'vaccine': return <VaccineIcon width={18} height={18} />
      case 'parasite': return <PillIcon width={18} height={18} />
      case 'appetite': return <BowlIcon width={18} height={18} />
      case 'venues': return <HouseIcon width={18} height={18} />
      case 'weight-first': return <i className="ti ti-scale text-[18px]" style={{ color: 'var(--color-danger)' }} />
      case 'weight-routine': return <i className="ti ti-scale text-[18px]" style={{ color: '#0F8F84' }} />
      case 'journal': return <i className="ti ti-mood-smile text-[18px]" style={{ color: 'var(--color-danger)' }} />
      case 'health-task': return <i className="ti ti-heart-rate-monitor text-[18px]" style={{ color: '#E05C97' }} />
      default: return <PawIcon width={18} height={18} />
    }
  }

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'vaccine':
        return {
          accentColor: 'var(--color-primary)',
          bg: 'rgba(93,63,211,0.04)',
          iconBg: 'rgba(93,63,211,0.12)',
          btnBg: 'var(--color-primary)',
          tagColor: 'var(--color-primary)',
          tagText: 'Tıbbi · Bugün'
        }
      case 'parasite':
        return {
          accentColor: 'var(--color-success)',
          bg: 'rgba(78,205,196,0.04)',
          iconBg: 'rgba(78,205,196,0.12)',
          btnBg: 'var(--color-success)',
          tagColor: '#0F8F84',
          tagText: 'Rutin Sağlık · Bugün'
        }
      case 'appetite':
        return {
          accentColor: 'var(--color-danger)',
          bg: 'rgba(255,107,107,0.04)',
          iconBg: 'rgba(255,107,107,0.12)',
          btnBg: 'var(--color-danger)',
          tagColor: 'var(--color-danger)',
          tagText: 'Takip · Bugün'
        }
      case 'weight-first':
        return {
          accentColor: 'var(--color-danger)',
          bg: 'rgba(255,107,107,0.04)',
          iconBg: 'rgba(255,107,107,0.12)',
          btnBg: 'var(--color-danger)',
          tagColor: 'var(--color-danger)',
          tagText: 'Profil · Eksik'
        }
      case 'weight-routine':
        return {
          accentColor: 'var(--color-success)',
          bg: 'rgba(78,205,196,0.04)',
          iconBg: 'rgba(78,205,196,0.12)',
          btnBg: 'var(--color-success)',
          tagColor: '#0F8F84',
          tagText: 'Rutin · Aylık'
        }
      case 'journal':
        return {
          accentColor: 'var(--color-danger)',
          bg: 'rgba(255,107,107,0.04)',
          iconBg: 'rgba(255,107,107,0.12)',
          btnBg: 'var(--color-danger)',
          tagColor: 'var(--color-danger)',
          tagText: 'Aktivite · Takip'
        }
      case 'health-task':
        return {
          accentColor: '#E05C97',
          bg: 'rgba(224,92,151,0.04)',
          iconBg: 'rgba(224,92,151,0.12)',
          btnBg: '#E05C97',
          tagColor: '#E05C97',
          tagText: 'Sağlık · Bugün'
        }
      case 'venues':
      default:
        return {
          accentColor: 'var(--color-primary)',
          bg: 'var(--color-primary-soft)',
          iconBg: 'rgba(93,63,211,0.12)',
          btnBg: 'var(--color-primary)',
          tagColor: 'var(--color-primary)',
          tagText: 'Yaşam · Bilgi'
        }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Başlık */}
      <div className="flex items-center gap-2 px-[var(--space-4)] mb-2.5">
        <p className="text-[11px] font-800 text-[var(--color-text-primary)]">
          Bugünkü Odak
        </p>
        {sorted.length > 0 && (
          <span className="text-[9px] font-800 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] px-[7px] py-[2px] rounded-full">
            {Math.min(sorted.length, 2)} / {sorted.length}
          </span>
        )}
      </div>

      {/* Kart Listesi */}
      <div className="flex flex-col gap-2 px-[var(--space-4)]">
        {visibleCards.map((card: any) => {
          const style = getCardStyle(card.type)
          return (
            <div
              key={card.id}
              className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-[var(--color-border)] shadow-sm"
              style={{ background: style.bg, borderLeft: `3px solid ${style.accentColor}` }}
            >
              <div
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: style.iconBg }}
              >
                {renderIcon(card.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-800 uppercase tracking-wide" style={{ color: style.tagColor }}>
                  {style.tagText}
                </p>
                <p className="text-[12px] font-800 text-[var(--color-text-primary)] truncate">
                  {card.title}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] font-500 leading-normal line-clamp-2">
                  {card.subtitle}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={card.action}
                  className="px-3.5 py-1.5 rounded-[10px] text-[11px] font-800 text-white transition-all active:scale-[0.97]"
                  style={{ background: style.btnBg }}
                >
                  {card.ctaLabel}
                </button>
                <button
                  onClick={() => dismissCard(card.id)}
                  className="px-3.5 py-1 rounded-[10px] text-[10px] font-700 text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]/20 transition-all text-center"
                >
                  Sonra
                </button>
              </div>
            </div>
          )
        })}

        {!expanded && sorted.length > 2 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center justify-center gap-1 py-2 text-[11px] font-700 text-[var(--color-primary)] active:scale-[0.98] transition-all"
          >
            {sorted.length - 2} görev daha var
            <i className="ti ti-chevron-down text-[13px]" />
          </button>
        )}
      </div>

      {quickUpdateConfig && quickUpdateConfig.type === 'journal' ? (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setQuickUpdateConfig(null)}>
          <div className="bg-surface w-full max-w-sm rounded-[24px] p-5 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <QuickJournalWidget
              pets={pets}
              activePet={pets.find(p => p.id === quickUpdateConfig.petId)}
              onSuccess={() => {
                dismissCard(`journal-${quickUpdateConfig.petId}`)
                setQuickUpdateConfig(null)
              }}
            />
          </div>
        </div>
      ) : quickUpdateConfig ? (
        <QuickUpdateModal
          config={quickUpdateConfig}
          onClose={() => setQuickUpdateConfig(null)}
          onDone={() => {
            dismissCard(quickUpdateConfig.petId) // Dismiss the triggering card
            setQuickUpdateConfig(null)
          }}
        />
      ) : null}
    </div>
  )
}
