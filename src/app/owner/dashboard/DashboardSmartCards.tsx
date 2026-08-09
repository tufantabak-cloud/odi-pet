'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ShieldCheck, Bug, Scale, Utensils, Sparkles, Phone, X } from 'lucide-react'
import QuickJournalWidget from '@/components/dashboard/QuickJournalWidget'
import { buildPetMicroTasks } from '@/lib/microTasks/petMicroTasks'
import { PetMicroTaskCard } from '@/components/micro-tasks/PetMicroTaskCard'
import { useDismissedMicroTasks } from '@/hooks/useDismissedMicroTasks'
import ParasitePlanCompletionModal from '@/components/pets/ParasitePlanCompletionModal'



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
  suppressSixMonthAlerts?: boolean
}

export default function DashboardSmartCards({ pets, activePetId, upcomingSchedules, completedSchedules = [], allWeightLogs = [], journalEntries = [], suppressSixMonthAlerts = false }: DashboardSmartCardsProps) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const petIds = pets.map(p => p.id)
  const { alerts, dismissAlert } = useSixMonthAssessments(supabase, petIds)

  const [quickUpdateConfig, setQuickUpdateConfig] = useState<any>(null)
  const [parasiteCompletionTask, setParasiteCompletionTask] = useState<any>(null)
  const [parasiteCompletionCardId, setParasiteCompletionCardId] = useState<string | null>(null)
  const [dismissedCards, setDismissedCards] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const { filterVisibleTasks, dismissTask } = useDismissedMicroTasks()


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
  const getParasiteTask = (petId?: string) => {
    const now = new Date()
    now.setHours(0,0,0,0)

    return upcomingSchedules.find((s: any) => {
      if (petId && s.pet_id !== petId) return false
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
    if (taskId.startsWith('virtual_')) {
      console.warn('Sanal takvim olayı değiştirilemez.');
      return;
    }
    try {
      const task = upcomingSchedules?.find((s: any) => s.id === taskId);
      if (task && task._source === 'plans' && task._plan_category === 'parazit') {
        setParasiteCompletionTask(task);
        setParasiteCompletionCardId(`parasite-task-${task.id}`);
        return;
      }

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

  // Collect active cards based on conditions in priority order for activePetId ONLY
  const activeCards: any[] = []
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const highlight = searchParams ? searchParams.get('highlight') : null

  let hasCriticalHealthTask = false
  let dashboardMicroTasks: any[] = []

  if (pets && pets.length > 0) {
    const targetPet = pets.find(p => p.id === activePetId) || pets[0]

    // 1. Highlight Deep-link Card (only if matching targetPet)
    let highlightCard: any = null
    if (highlight) {
      if (highlight.startsWith('vaccine-') || highlight.startsWith('parasite-')) {
        const isVaccine = highlight.startsWith('vaccine-')
        const petId = isVaccine ? highlight.replace('vaccine-', '') : highlight.replace('parasite-', '')
        if (petId === targetPet.id) {
          const pet = targetPet

          if (isVaccine) {
            highlightCard = {
              id: highlight,
              type: 'vaccine',
              priority: 0,
              isCritical: true,
              title: 'Aşı Uygulaması',
              subtitle: `Bugün ${pet.name}'nın aşı/medikal işlemi var. Takvimden kontrol edebilirsiniz.`,
              dateInfo: 'Bugün',
              ctaLabel: 'Takvime Git',
              action: () => {
                router.push(`/owner/plan-yap/asi?pet_id=${pet.id}`)
              }
            }
          } else {
            const parasiteTask = getParasiteTask(targetPet.id)
            const nextParasiteDateStr = typeof window !== 'undefined' ? localStorage.getItem(`parasite-next-date-${pet.id}`) : null
            const cardId = parasiteTask ? `parasite-task-${parasiteTask.id}` : `parasite-local-${pet.id}-${nextParasiteDateStr || 'init'}`
            highlightCard = {
              id: highlight,
              type: 'parasite',
              priority: 0,
              isCritical: true,
              title: 'Dış Parazit Uygulaması',
              subtitle: `Bugün ${pet.name}'nın dış parazit uygulaması zamanı. Yaptıktan sonra işaretleyin.`,
              dateInfo: 'Bugün',
              ctaLabel: 'İşaretle',
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
    }

    if (highlightCard) {
      activeCards.push(highlightCard)
    }

    // Günü Gelmiş/Geçmiş Aşı Kontrolü (Priority 1)
    const todayDate = new Date()
    todayDate.setHours(0,0,0,0)

    const overdueVaccine = upcomingSchedules?.find((s: any) => {
      if (s.pet_id !== targetPet.id) return false
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
      if (highlight !== vaccineCardId && !isAlreadyHighlighted) {
        const pet = targetPet
        const dueDate = new Date(overdueVaccine.due_date)
        dueDate.setHours(0,0,0,0)
        const isOverdue = dueDate < todayDate
        activeCards.push({
          id: vaccineCardId,
          type: 'vaccine',
          priority: 1,
          isCritical: true,
          title: overdueVaccine.title || overdueVaccine.vaccines?.name || 'Aşı Uygulaması',
          subtitle: `${pet.name}'nın ${overdueVaccine.title || overdueVaccine.vaccines?.name || 'aşı/medikal'} işlemi var. Takvimden kontrol edebilirsiniz.`,
          dateInfo: isOverdue ? 'Gecikti' : 'Bugün',
          ctaLabel: 'Takvime Git',
          action: () => {
            router.push(`/owner/plan-yap/asi?pet_id=${pet.id}`)
          }
        })
      }
    }

    // Günü Geçmiş Sağlık Görevleri (Priority 2)
    const overdueHealthTasks = upcomingSchedules?.filter((s: any) => {
      if (s.pet_id !== targetPet.id) return false
      if (s.status === 'done') return false
      const isHealth = s.category === 'saglik' || s.category === 'Saglik'
      if (!isHealth) return false
      if (!s.due_date) return false
      const dueDate = new Date(s.due_date)
      dueDate.setHours(0,0,0,0)
      return dueDate < todayDate
    })

    if (overdueHealthTasks && overdueHealthTasks.length > 0) {
      const healthCardId = `health-tasks-overdue-${targetPet.id}-${todayDate.toISOString().split('T')[0]}`
      if (highlight !== healthCardId) {
        const pet = targetPet
        const taskCount = overdueHealthTasks.length
        const firstTask = overdueHealthTasks[0]
        const taskTitle = firstTask.title || firstTask.sub_category || 'Sağlık Görevi'
        activeCards.push({
          id: healthCardId,
          type: 'health-task',
          priority: 2,
          isCritical: true,
          title: taskCount === 1 ? taskTitle : `${taskCount} Sağlık Görevi Bekliyor`,
          subtitle: taskCount === 1
            ? `${pet.name}'nın ${taskTitle} görevi gecikti.`
            : `${pet.name}'nın bugün öncesi geciken sağlık görevleri var.`,
          dateInfo: 'Gecikti',
          ctaLabel: 'Görüntüle',
          action: () => {
            router.push(`/owner/pets/${pet.id}?tab=saglik#section-saglik`)
          }
        })
      }
    }

    // 3. Dış Parazit Card (Priority 3)
    const parasiteTask = getParasiteTask(targetPet.id)
    const petIdForParasite = targetPet.id
    const nextParasiteDateStr = typeof window !== 'undefined' ? localStorage.getItem(`parasite-next-date-${petIdForParasite}`) : null
    let isParasiteDue = false
    let isParasiteOverdue = false
    
    if (parasiteTask) {
      isParasiteDue = true
      const dueDate = new Date(parasiteTask.due_date)
      dueDate.setHours(0,0,0,0)
      if (dueDate < todayDate) isParasiteOverdue = true
    } else if (nextParasiteDateStr) {
      const nextDate = new Date(nextParasiteDateStr)
      if (nextDate <= new Date()) {
        isParasiteDue = true
      }
    }

    const parasiteCardId = parasiteTask ? `parasite-task-${parasiteTask.id}` : `parasite-local-${petIdForParasite}-${nextParasiteDateStr || 'init'}`
    const showParasiteCard = isParasiteDue && highlight !== parasiteCardId

    if (showParasiteCard) {
      const pet = targetPet
      activeCards.push({
        id: parasiteCardId,
        type: 'parasite',
        priority: 3,
        isCritical: true,
        title: 'Dış Parazit Uygulaması',
        subtitle: `${pet.name}'nın dış parazit uygulaması zamanı. Yaptıktan sonra işaretleyin.`,
        dateInfo: isParasiteOverdue ? 'Gecikti' : 'Bugün',
        ctaLabel: 'İşaretle',
        action: () => handleMarkParasiteDone(pet.id, parasiteTask, parasiteCardId)
      })
    }

    // 4. Bugün Yapılacak Sağlık Görevleri (Priority 4)
    const todayHealthTasks = upcomingSchedules?.filter((s: any) => {
      if (s.pet_id !== targetPet.id) return false
      if (s.status === 'done') return false
      const isHealth = s.category === 'saglik' || s.category === 'Saglik'
      if (!isHealth) return false
      if (!s.due_date) return false
      const dueDate = new Date(s.due_date)
      dueDate.setHours(0,0,0,0)
      return dueDate.getTime() === todayDate.getTime()
    })

    if (todayHealthTasks && todayHealthTasks.length > 0) {
      const healthCardId = `health-tasks-today-${targetPet.id}-${todayDate.toISOString().split('T')[0]}`
      if (highlight !== healthCardId) {
        const pet = targetPet
        const taskCount = todayHealthTasks.length
        const firstTask = todayHealthTasks[0]
        const taskTitle = firstTask.title || firstTask.sub_category || 'Sağlık Görevi'
        activeCards.push({
          id: healthCardId,
          type: 'health-task',
          priority: 4,
          isCritical: true,
          title: taskCount === 1 ? taskTitle : `${taskCount} Sağlık Görevi Bugün`,
          subtitle: taskCount === 1
            ? `${pet.name}'nın bugün için planlanmış ${taskTitle} görevi var.`
            : `${pet.name}'nın bugün için planlanmış sağlık görevleri var.`,
          dateInfo: 'Bugün',
          ctaLabel: 'Görüntüle',
          action: () => {
            router.push(`/owner/pets/${pet.id}?tab=saglik#section-saglik`)
          }
        })
      }
    }

    // 5. Aşı Sonrası İştah (Takip - Priority 5)
    const recentVaccine = completedSchedules.find((s: any) => {
      if (s.pet_id !== targetPet.id) return false
      const isCompleted = s.status === 'completed' || s.status === 'done'
      const updatedDate = s.updated_at ? new Date(s.updated_at) : new Date(s.completed_at || s.due_date)
      const isRecent = updatedDate.getTime() > Date.now() - 24 * 60 * 60 * 1000
      const isVaccineTask =
        s._plan_category === 'asi' ||
        (s.category || '').toLowerCase().includes('asi') ||
        (s.category || '').toLowerCase().includes('aşı') ||
        (s.sub_category || '').toLowerCase().includes('asi') ||
        (s.sub_category || '').toLowerCase().includes('aşı') ||
        (s.title || '').toLowerCase().includes('aşı') ||
        (s.title || '').toLowerCase().includes('asi') ||
        !!s.vaccines
      return isCompleted && isRecent && isVaccineTask
    })


    if (recentVaccine) {
      const appetiteCardId = `appetite-${recentVaccine.id}`
      const showAppetiteCard = !dismissedCards.includes(appetiteCardId) && highlight !== appetiteCardId

      if (showAppetiteCard) {
        const pet = targetPet
        activeCards.push({
          id: appetiteCardId,
          type: 'appetite',
          priority: 5,
          isCritical: true,
          title: 'Aşı Sonrası Takip',
          subtitle: `${pet.name}'nın aşısı tamamlandı. Aşı sonrası ilk 24 saat iştah takibi önemlidir. İştahını kaydetmek ister misin?`,
          dateInfo: 'Takip',
          ctaLabel: 'İştahı Kaydet',
          action: () => {
            router.push(`/owner/pets/${pet.id}/journal/new/appetite`)
          }
        })
      }
    }

    // 6. Kritik Eksik Bilgi (Priority 6)
    const lastWeightLog = allWeightLogs?.find(w => w.pet_id === targetPet.id)
    const daysSinceLastLog = lastWeightLog
      ? Math.floor((Date.now() - new Date(lastWeightLog.measured_at).getTime()) / 86400000)
      : null

    const isFirstEntry = !lastWeightLog
    const isRoutineDue = lastWeightLog && daysSinceLastLog !== null && daysSinceLastLog >= 30

    const weightFirstCardId = `weight-first-${targetPet.id}`
    if (isFirstEntry && !dismissedCards.includes(weightFirstCardId) && highlight !== weightFirstCardId) {
      activeCards.push({
        id: weightFirstCardId,
        type: 'weight-first',
        priority: 6,
        isCritical: true,
        title: 'Kilo & Boy Bilgisi Eksik',
        subtitle: `${targetPet.name}'in profilini tamamla`,
        dateInfo: 'Eksik Bilgi',
        ctaLabel: 'Gir',
        action: () => {
          router.push(`/owner/pets/${targetPet.id}/nutrition?tab=kilo`)
        }
      })
    }

    const emergencyContactCardId = `emergency-contact-${targetPet.id}`
    const hasEmergencyContact = targetPet?.sos_contacts && Array.isArray(targetPet.sos_contacts) && targetPet.sos_contacts.length > 0

    if (!hasEmergencyContact && !dismissedCards.includes(emergencyContactCardId) && highlight !== emergencyContactCardId) {
      activeCards.push({
        id: emergencyContactCardId,
        type: 'emergency-contact',
        priority: 6,
        isCritical: true,
        title: 'Acil Durum Kişisi Eksik',
        subtitle: `Beklenmeyen durumlar için acil durumda ulaşılacak kişiyi ekleyin.`,
        dateInfo: 'Eksik Bilgi',
        ctaLabel: 'Şimdi Ekle',
        action: () => {
          router.push(`/owner/pets/${targetPet.id}/edit?highlight=emergencyContact#sos-section`)
        }
      })
    }

    // 7. Kilo Rutin Zamanı (Aylık - Priority 7 - Non-Critical)
    const weightRoutineCardId = `weight-routine-${targetPet.id}`
    if (isRoutineDue && !dismissedCards.includes(weightRoutineCardId) && highlight !== weightRoutineCardId) {
      activeCards.push({
        id: weightRoutineCardId,
        type: 'weight-routine',
        priority: 7,
        isCritical: false,
        title: 'Aylık Kilo Kontrolü',
        subtitle: `Son ölçüm: ${daysSinceLastLog} gün önce — güncelle`,
        dateInfo: 'Rutin',
        ctaLabel: 'Güncelle',
        action: () => {
          router.push(`/owner/pets/${targetPet.id}/nutrition?tab=kilo`)
        }
      })
    }

    // 8. Journal Card (Priority 8 - Non-Critical)
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
        priority: 8,
        isCritical: false,
        title: `${targetPet.name} Bugün Nasıl Hissediyor?`,
        subtitle: `${targetPet.name}'in günlük iştah ve ruh halini kaydet`,
        dateInfo: 'Günlük',
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

    hasCriticalHealthTask = activeCards.some(c => c.isCritical && (c.type === 'vaccine' || c.type === 'health-task' || c.type === 'parasite' || c.type === 'appetite'))

    dashboardMicroTasks = targetPet
      ? filterVisibleTasks(
          activePetId,
          buildPetMicroTasks({
            pet: targetPet,
            vaccinePlans: upcomingSchedules?.filter(
              (s: any) => s.pet_id === activePetId && ((s.sub_category || '').includes('Aşı') || (s.title || '').toLowerCase().includes('aşı'))
            ) ?? [],
            parasitePlans: upcomingSchedules?.filter(
              (s: any) => s.pet_id === activePetId && ((s.sub_category || '').includes('Parazit') || (s.title || '').toLowerCase().includes('parazit'))
            ) ?? [],
            carePlans: upcomingSchedules?.filter(
              (s: any) => s.pet_id === activePetId && (s._plan_category === 'bakim' || s.category === 'Bakım' || s.category === 'bakim')
            ) ?? [],
            latestWeight: allWeightLogs?.find(w => w.pet_id === activePetId) ?? null,
            nutritionProfile: null,
          }).filter(t => t.type !== 'missing_emergency_contact')
        )
      : []
  }

  // Sort active cards strictly by priority ascending
  activeCards.sort((a, b) => a.priority - b.priority)

  // 3.5 Positive state fallback when no real health/routine cards exist for targetPet
  if (activeCards.length === 0 && pets && pets.length > 0) {
    const targetPet = pets.find(p => p.id === activePetId) || pets[0]
    const todayDate = new Date()
    todayDate.setHours(0,0,0,0)

    const upcomingForPet = upcomingSchedules
      ?.filter((s: any) => {
        if (s.pet_id !== targetPet?.id) return false
        if (s.status === 'done') return false
        const d = new Date(s.due_date)
        d.setHours(0,0,0,0)
        return d > todayDate
      })
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

    const nextSchedule = upcomingForPet && upcomingForPet.length > 0 ? upcomingForPet[0] : null
    const nextDateFormatted = nextSchedule
      ? new Date(nextSchedule.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
      : null
    const nextTaskName = nextSchedule
      ? (nextSchedule.title || nextSchedule.sub_category || nextSchedule.vaccines?.name || 'Bakım Görevi')
      : null

    activeCards.push({
      id: `positive-${targetPet.id}`,
      type: 'positive',
      priority: 9,
      isCritical: false,
      title: 'Bugün her şey yolunda 🎉',
      subtitle: nextSchedule
        ? `Sıradaki: ${nextDateFormatted} · ${nextTaskName}`
        : 'Şimdilik planlanmış bir bakım görevi bulunmuyor.',
      ctaLabel: nextSchedule ? 'Ajandayı Gör' : 'Rutin Planla',
      action: nextSchedule
        ? () => {
            const el = document.getElementById('section-ajanda')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
            else router.push(`/owner/pets/${targetPet.id}`)
          }
        : () => router.push('/owner/plan-yap')
    })
  }

  const sorted = activeCards

  const targetPetObj = pets && pets.length > 0 ? (pets.find(p => p.id === activePetId) || pets[0]) : null
  const activeAlerts = (targetPetObj && !suppressSixMonthAlerts) ? alerts.filter((a: any) => a.petId === targetPetObj.id) : []

  const mainCard = sorted.length > 0 ? sorted[0] : null
  const compactCriticalCards = sorted.length > 1 ? sorted.slice(1).filter((c: any) => c.isCritical) : []
  const nonCriticalCards = sorted.length > 1 ? sorted.slice(1).filter((c: any) => !c.isCritical) : []

  const renderIcon = (type: string) => {
    const iconClass = "w-5 h-5 stroke-[2]"
    switch (type) {
      case 'vaccine': return <ShieldCheck className={iconClass} />
      case 'parasite': return <Bug className={iconClass} />
      case 'appetite': return <Utensils className={iconClass} />
      case 'weight-first':
      case 'weight-routine': return <Scale className={iconClass} />
      case 'health-task': return <ShieldCheck className={iconClass} />
      case 'emergency-contact': return <Phone className={iconClass} />
      case 'journal': return <Sparkles className={iconClass} />
      case 'positive':
      default: return <ShieldCheck className={iconClass} />
    }
  }

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'emergency-contact':
        return {
          accentColor: '#F59E0B',
          bg: 'rgba(245,158,11,0.03)',
          iconBg: 'rgba(245,158,11,0.10)',
          iconColor: '#D97706',
          btnBg: '#F59E0B',
          tagColor: '#D97706',
          tagText: 'Güvenlik · Eksik'
        }
      case 'vaccine':
        return {
          accentColor: 'var(--color-primary, #5D3EBD)',
          bg: 'rgba(93,63,211,0.03)',
          iconBg: 'rgba(93,63,211,0.10)',
          iconColor: 'var(--color-primary, #5D3EBD)',
          btnBg: 'var(--color-primary, #5D3EBD)',
          tagColor: 'var(--color-primary, #5D3EBD)',
          tagText: 'Tıbbi · Sağlık'
        }
      case 'parasite':
        return {
          accentColor: '#0F8F84',
          bg: 'rgba(78,205,196,0.03)',
          iconBg: 'rgba(78,205,196,0.10)',
          iconColor: '#0F8F84',
          btnBg: '#0F8F84',
          tagColor: '#0F8F84',
          tagText: 'Rutin Sağlık'
        }
      case 'appetite':
        return {
          accentColor: '#EF4444',
          bg: 'rgba(239,68,68,0.03)',
          iconBg: 'rgba(239,68,68,0.10)',
          iconColor: '#EF4444',
          btnBg: '#EF4444',
          tagColor: '#EF4444',
          tagText: 'Takip · Bugün'
        }
      case 'weight-first':
        return {
          accentColor: '#EF4444',
          bg: 'rgba(239,68,68,0.03)',
          iconBg: 'rgba(239,68,68,0.10)',
          iconColor: '#EF4444',
          btnBg: '#EF4444',
          tagColor: '#EF4444',
          tagText: 'Profil · Eksik'
        }
      case 'weight-routine':
        return {
          accentColor: '#0F8F84',
          bg: 'rgba(78,205,196,0.03)',
          iconBg: 'rgba(78,205,196,0.10)',
          iconColor: '#0F8F84',
          btnBg: '#0F8F84',
          tagColor: '#0F8F84',
          tagText: 'Rutin · Aylık'
        }
      case 'journal':
        return {
          accentColor: '#EF4444',
          bg: 'rgba(239,68,68,0.03)',
          iconBg: 'rgba(239,68,68,0.10)',
          iconColor: '#EF4444',
          btnBg: '#EF4444',
          tagColor: '#EF4444',
          tagText: 'Aktivite · Takip'
        }
      case 'health-task':
        return {
          accentColor: '#E05C97',
          bg: 'rgba(224,92,151,0.03)',
          iconBg: 'rgba(224,92,151,0.10)',
          iconColor: '#E05C97',
          btnBg: '#E05C97',
          tagColor: '#E05C97',
          tagText: 'Sağlık · Görev'
        }
      case 'positive':
        return {
          accentColor: '#0F8F84',
          bg: 'rgba(78,205,196,0.03)',
          iconBg: 'rgba(78,205,196,0.10)',
          iconColor: '#0F8F84',
          btnBg: 'var(--color-primary, #5D3EBD)',
          tagColor: '#0F8F84',
          tagText: 'Durum · Harika'
        }
      case 'venues':
      default:
        return {
          accentColor: 'var(--color-primary, #5D3EBD)',
          bg: 'rgba(93,63,211,0.03)',
          iconBg: 'rgba(93,63,211,0.10)',
          iconColor: 'var(--color-primary, #5D3EBD)',
          btnBg: 'var(--color-primary, #5D3EBD)',
          tagColor: 'var(--color-primary, #5D3EBD)',
          tagText: 'Yaşam · Bilgi'
        }
    }
  }

  const renderMainCard = (card: any) => {
    const style = getCardStyle(card.type)
    const isDismissible = !['positive', 'vaccine', 'health-task', 'parasite'].includes(card.type)
    return (
      <div
        key={card.id}
        className="relative flex items-center justify-between gap-3 p-4 rounded-[24px] border border-slate-100 bg-white shadow-xs overflow-hidden transition-all duration-200 select-none"
        style={{ background: style.bg }}
      >
        {/* Sol Vurgu Çubuğu (Inset accent bar - rounded corners ile tam uyumlu) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[24px]"
          style={{ backgroundColor: style.accentColor }}
        />

        {/* İkon Kapsayıcı */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ml-1"
          style={{ background: style.iconBg, color: style.iconColor }}
        >
          {renderIcon(card.type)}
        </div>

        {/* Metin İçeriği */}
        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-2xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: style.tagColor }}>
            {card.dateInfo || style.tagText}
          </p>
          <h4 className="text-sm font-semibold text-text-primary leading-snug truncate">
            {card.title}
          </h4>
          <p className="text-xs font-normal text-text-secondary leading-normal line-clamp-2 mt-0.5">
            {card.subtitle}
          </p>
        </div>

        {/* Aksiyon Alanı (Yatay Hizalı) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={card.action}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-[0.97] shadow-xs"
            style={{ background: style.btnBg }}
          >
            {card.ctaLabel}
          </button>
          {isDismissible && (
            <button
              onClick={() => dismissCard(card.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors"
              title="Sonra"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderCompactCriticalRow = (card: any) => {
    const style = getCardStyle(card.type)
    const isDismissible = !['vaccine', 'health-task', 'parasite'].includes(card.type)
    return (
      <div
        key={card.id}
        className="relative flex items-center justify-between gap-3 p-4 rounded-[24px] border border-slate-100 bg-white shadow-xs overflow-hidden transition-all duration-200 select-none"
        style={{ background: style.bg }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[24px]"
          style={{ backgroundColor: style.accentColor }}
        />
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ml-1"
          style={{ background: style.iconBg, color: style.iconColor }}
        >
          {renderIcon(card.type)}
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-2xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: style.tagColor }}>
            {card.dateInfo || style.tagText}
          </p>
          <h4 className="text-sm font-semibold text-text-primary leading-snug truncate">
            {card.title}
          </h4>
          <p className="text-xs font-normal text-text-secondary leading-normal truncate mt-0.5">
            {card.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={card.action}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-[0.97]"
            style={{ background: style.btnBg }}
          >
            {card.ctaLabel}
          </button>
          {isDismissible && (
            <button
              onClick={() => dismissCard(card.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors"
              title="Sonra"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Başlık */}
      <div className="flex items-center gap-2 mb-1 px-1">
        <p className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Bugünkü Odak
        </p>
        {sorted.length > 0 && sorted[0].type !== 'positive' && (
          <span className="text-2xs font-semibold bg-slate-100 text-text-secondary px-2 py-0.5 rounded-full">
            1 / {sorted.length}
          </span>
        )}
      </div>

      {/* Kart Listesi */}
      <div className="flex flex-col gap-2">
        {/* 1. Bir Büyük Ana Kart */}
        {mainCard && renderMainCard(mainCard)}

        {/* 2. Ek Kritik Görevler (Kompakt Satırlar) */}
        {compactCriticalCards.map((card: any) => renderCompactCriticalRow(card))}

        {/* 3. Kritik Olmayan Görevler (Expander ile açılır) */}
        {expanded && nonCriticalCards.map((card: any) => renderMainCard(card))}

        {/* 4. Expander Butonu */}
        {!expanded && nonCriticalCards.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center justify-center gap-1 py-2 text-[11px] font-700 text-[var(--color-primary)] active:scale-[0.98] transition-all"
          >
            {nonCriticalCards.length} görev daha var
            <i className="ti ti-chevron-down text-[13px]" />
          </button>
        )}

        {/* 5. Mikro Görev (Kritik görev yoksa en fazla 1 adet) */}
        {!hasCriticalHealthTask && dashboardMicroTasks.length > 0 && (
          <PetMicroTaskCard
            task={dashboardMicroTasks[0]}
            petId={activePetId}
            onDismiss={(id) => dismissTask(activePetId, id)}
          />
        )}

        {/* 6. 6 Aylık Temel Aşı Değerlendirmesi Alert (Sadece Aktif Pet) */}
        {activeAlerts.map((alert: any) => (
          <SixMonthDashboardCard
            key={alert.petId}
            alert={alert}
            onDismiss={dismissAlert}
          />
        ))}
      </div>

      {quickUpdateConfig && quickUpdateConfig.type === 'journal' ? (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setQuickUpdateConfig(null)}>
          <div className="bg-surface w-full max-w-sm rounded-sheet p-5 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
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

      {parasiteCompletionTask && (
        <ParasitePlanCompletionModal
          planId={parasiteCompletionTask._plan_id}
          petId={parasiteCompletionTask.pet_id}
          onClose={() => {
            setParasiteCompletionTask(null);
            setParasiteCompletionCardId(null);
          }}
          onSuccess={() => {
            if (parasiteCompletionCardId) {
              dismissCard(parasiteCompletionCardId);
            }
            router.refresh();
            setParasiteCompletionTask(null);
            setParasiteCompletionCardId(null);
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// 6 AYLIK TEMEL AŞI DEĞERLENDİRMESİ BİLEŞENLERİ (Madde 3)
// ============================================================

function useSixMonthAssessments(supabase: any, petIds: string[]) {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!petIds.length) return;

    supabase
      .from('vaccine_records_v2')
      .select('pet_id, vaccine_code, administered_at, dose_number, pets!inner(id, name, species)')
      .in('pet_id', petIds)
      .in('vaccine_code', ['DOG_DHPPI','DOG_CDV','DOG_CPV','DOG_CAV','CAT_FPV','CAT_FHV1','CAT_FCV'])
      .eq('status', 'completed')
      .order('administered_at', { ascending: false })
      .then(({ data }: any) => {
        if (!data) return;
        const latestByPet = new Map();
        for (const r of data) {
          if (!latestByPet.has(r.pet_id)) latestByPet.set(r.pet_id, r);
        }
        const now = Date.now();
        const result = [];
        for (const [petId, record] of latestByPet) {
          const weeks = Math.floor((now - new Date(record.administered_at).getTime()) / (1000*60*60*24*7));
          if (weeks < 24 || weeks > 52) continue;
          const key = `odipet_assessment_dismissed_${petId}`;
          if (localStorage.getItem(key)) continue;
          result.push({
            petId,
            petName: record.pets.name,
            petSpecies: record.pets.species,
            weeksSinceLastDose: weeks,
          });
        }
        setAlerts(result);
      });
  }, [petIds.join(',')]);

  function dismissAlert(petId: string) {
    localStorage.setItem(`odipet_assessment_dismissed_${petId}`, new Date().toISOString());
    setAlerts(prev => prev.filter(a => a.petId !== petId));
  }

  return { alerts, dismissAlert };
}

interface SixMonthDashboardCardProps {
  alert: {
    petId: string;
    petName: string;
    weeksSinceLastDose: number;
  };
  onDismiss: (petId: string) => void;
}

export function SixMonthDashboardCard({ alert, onDismiss }: SixMonthDashboardCardProps) {
  const router = useRouter();
  
  return (
    <div
      className="relative p-4 rounded-[24px] border border-slate-100 shadow-xs flex flex-col gap-3 overflow-hidden bg-white"
      style={{
        background: 'rgba(93,63,211,0.03)',
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[24px]"
        style={{ backgroundColor: 'var(--color-primary, #5D3EBD)' }}
      />
      <button
        onClick={() => onDismiss(alert.petId)}
        aria-label="Kapat"
        className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col gap-1 pr-8 pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-text-primary">
            {alert.petName} · 6 aylık aşı değerlendirmesi
          </p>
          <span className="text-2xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            WSAVA 2024 önerisi
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Son yavru dozu {alert.weeksSinceLastDose} hafta önce yapıldı. Kullanılan ürüne göre veterineriniz ek doz gerekip gerekmediğini değerlendirebilir.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 pl-1">
        <button
          onClick={() => router.push(`/owner/plan-yap/asi?pet_id=${alert.petId}`)}
          className="self-start px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:opacity-90 transition-all active:scale-[0.97]"
        >
          Aşı sayfasına git →
        </button>
        <p className="text-2xs text-text-secondary italic leading-tight">
          Veteriner kararının yerine geçmez. Türkiye&apos;de standart protokol değildir.
        </p>
      </div>
    </div>
  );
}
