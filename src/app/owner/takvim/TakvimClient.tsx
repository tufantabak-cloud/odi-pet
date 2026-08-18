'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getSpeciesEmoji } from '@/lib/species'
import { getPlanTargetUrl, getPlanActionLabel, type TakvimCategoryKey } from '@/lib/agenda/takvim-navigation'
import { VaccineIcon, ParasiteIcon, ShampooIcon, BowlIcon, VetIcon, BoneIcon } from '@/components/icons/PetIcons'
import { CalendarPlus, LayoutGrid, Plus, AlertTriangle, CheckCircle2, CalendarCheck } from 'lucide-react'

type Pet = {
  id: string
  name: string
  species: string | null
  avatar_url: string | null
}

type CalendarEvent = {
  id: string
  type: 'task' | 'appointment'
  plan_type: string | null
  title: string
  date: string
  pet_id: string | null
  pet_name: string
  pet_species?: string
  status: string | null
  assignment_status?: string | null
  escalation_level?: string
  priority?: string
  assigned_to?: string | null
  assignee_name?: string | null
}

type CategoryKey = 'asi' | 'parazit' | 'bakim' | 'beslenme' | 'randevu' | 'diger'

const CATEGORY_STYLE: Record<CategoryKey, { label: string; fg: string; bg: string }> = {
  asi:      { label: 'Aşı',      fg: '#3B9FE8', bg: 'rgba(59,159,232,0.12)' },
  parazit:  { label: 'Parazit',  fg: '#34C97A', bg: 'rgba(52,201,122,0.12)' },
  bakim:    { label: 'Bakım',    fg: '#F06292', bg: 'rgba(240,98,146,0.12)' },
  beslenme: { label: 'Beslenme', fg: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  randevu:  { label: 'Randevu',  fg: '#4F46E5', bg: 'rgba(79,70,229,0.12)' },
  diger:    { label: 'Diğer',    fg: '#9C26AF', bg: 'rgba(156,38,175,0.10)' },
}

function CategoryIcon({ category, size = 16 }: { category: CategoryKey; size?: number }) {
  switch (category) {
    case 'asi': return <VaccineIcon size={size} />
    case 'parazit': return <ParasiteIcon size={size} />
    case 'bakim': return <ShampooIcon width={size} height={size} />
    case 'beslenme': return <BowlIcon width={size} height={size} />
    case 'randevu': return <VetIcon width={size} height={size} />
    case 'diger':
    default: return <BoneIcon width={size} height={size} />
  }
}

const FILTERS: Array<{ key: 'tumu' | CategoryKey; label: string }> = [
  { key: 'tumu', label: 'Tümü' },
  { key: 'asi', label: 'Aşı' },
  { key: 'parazit', label: 'Parazit' },
  { key: 'bakim', label: 'Bakım' },
  { key: 'randevu', label: 'Randevu' },
]

/** plan_type / başlık metninden kategori çıkarır */
function toCategory(ev: CalendarEvent): CategoryKey {
  if (ev.type === 'appointment') return 'randevu'
  const raw = `${ev.plan_type ?? ''} ${ev.title ?? ''}`.toLocaleLowerCase('tr')
  if (raw.includes('aşı') || raw.includes('asi') || raw.includes('vaccine')) return 'asi'
  if (raw.includes('parazit')) return 'parazit'
  if (raw.includes('bakım') || raw.includes('bakim') || raw.includes('hijyen') || raw.includes('tırnak')) return 'bakim'
  if (raw.includes('mama') || raw.includes('beslenme') || raw.includes('kilo')) return 'beslenme'
  return 'diger'
}

/** Yerel takvim gününe göre gün farkı (saat bileşeni sıfırlanır) */
function dayDiff(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

type BucketKey = 'geciken' | 'bugun' | 'buHafta' | 'sonraki' | 'sonYapilanlar'

const BUCKET_META: Record<BucketKey, { label: string; overdue?: boolean; isCompleted?: boolean }> = {
  geciken:       { label: 'Geciken', overdue: true },
  bugun:         { label: 'Bugün' },
  buHafta:       { label: 'Bu hafta' },
  sonraki:       { label: 'Sonraki 30 gün' },
  sonYapilanlar: { label: 'SON YAPILANLAR', isCompleted: true },
}

const UPCOMING_BUCKET_KEYS: BucketKey[] = ['geciken', 'bugun', 'buHafta', 'sonraki']
const COMPLETED_BUCKET_KEYS: BucketKey[] = ['sonYapilanlar']

export default function TakvimClient({ pets, initialEvents = [] }: { pets: Pet[]; initialEvents?: CalendarEvent[] }) {
  const [activePetId, setActivePetId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'tumu' | CategoryKey>('tumu')
  const [activeView, setActiveView] = useState<'yaklasan' | 'sonYapilanlar'>('yaklasan')

  const multiPet = pets.length > 1
  const effectivePetId = activePetId || (pets.length === 1 ? pets[0].id : null)
  const targetPlanUrl = getPlanTargetUrl(activeFilter, effectivePetId)
  const targetPlanLabel = getPlanActionLabel(activeFilter)

  const events = useMemo(() => {
    if (!activePetId) return initialEvents
    return initialEvents.filter(ev => ev.pet_id === activePetId)
  }, [initialEvents, activePetId])

  const visibleEvents = useMemo(() => {
    const list = activeFilter === 'tumu'
      ? events
      : events.filter(ev => toCategory(ev) === activeFilter)
    return [...list].sort((a, b) => a.date.localeCompare(b.date))
  }, [events, activeFilter])

  const buckets = useMemo(() => {
    const out: Record<BucketKey, CalendarEvent[]> = {
      geciken: [], bugun: [], buHafta: [], sonraki: [], sonYapilanlar: [],
    }
    for (const ev of visibleEvents) {
      const isCompleted = ev.status === 'completed' || ev.status === 'done'
      if (isCompleted) {
        out.sonYapilanlar.push(ev)
      } else {
        const diff = dayDiff(ev.date)
        if (diff < 0) out.geciken.push(ev)
        else if (diff === 0) out.bugun.push(ev)
        else if (diff <= 7) out.buHafta.push(ev)
        else out.sonraki.push(ev)
      }
    }
    // Son yapılanlar en yeniden eskiye sıralanır
    out.sonYapilanlar.sort((a, b) => b.date.localeCompare(a.date))
    return out
  }, [visibleEvents])

  const activePet = activePetId ? pets.find(p => p.id === activePetId) ?? null : null

  const upcomingCount = useMemo(() => {
    return (
      buckets.geciken.length +
      buckets.bugun.length +
      buckets.buHafta.length +
      buckets.sonraki.length
    )
  }, [buckets])

  const completedCount = buckets.sonYapilanlar.length
  const currentBucketKeys = activeView === 'yaklasan' ? UPCOMING_BUCKET_KEYS : COMPLETED_BUCKET_KEYS
  const currentCount = activeView === 'yaklasan' ? upcomingCount : completedCount

  return (
    <div className="flex flex-col gap-3 pb-32 w-full mx-auto font-sans">

      {/* Başlık */}
      <div className="px-4 pt-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-bold text-text-primary leading-tight tracking-tight">Takvim</h1>
          <p className="text-xs text-text-secondary font-medium">
            {activePet ? `${activePet.name} · ` : ''}
            {activeView === 'yaklasan'
              ? `${upcomingCount} yaklaşan görev`
              : `${completedCount} tamamlanan görev`}
            <span className="text-text-tertiary">
              {activeView === 'yaklasan' ? ' · sonraki 30 gün' : ' · son 30 gün'}
            </span>
          </p>
        </div>
        <Link
          href={targetPlanUrl}
          prefetch={false}
          aria-label={targetPlanLabel}
          title={targetPlanLabel}
          className="w-11 h-11 min-h-11 shrink-0 rounded-full flex items-center justify-center border border-border-main bg-surface text-text-secondary hover:text-primary hover:border-primary/30 transition-all active:scale-95 shadow-sm"
        >
          <CalendarPlus className="w-5 h-5" />
        </Link>
      </div>

      {/* Görünüm Sekmeleri: Yaklaşan Görevler (Varsayılan) / Son Yapılanlar */}
      <div className="px-4">
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-secondary/70 border border-border-main/60">
          <button
            type="button"
            onClick={() => setActiveView('yaklasan')}
            aria-pressed={activeView === 'yaklasan'}
            className={`min-h-11 flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              activeView === 'yaklasan'
                ? 'bg-surface text-text-primary shadow-sm font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Yaklaşan Görevler</span>
            {upcomingCount > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                  activeView === 'yaklasan'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-text-secondary'
                }`}
              >
                {upcomingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('sonYapilanlar')}
            aria-pressed={activeView === 'sonYapilanlar'}
            className={`min-h-11 flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              activeView === 'sonYapilanlar'
                ? 'bg-surface text-text-primary shadow-sm font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Son Yapılanlar</span>
            {completedCount > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                  activeView === 'sonYapilanlar'
                    ? 'bg-[#F0FDF4] text-[#166534]'
                    : 'bg-surface text-text-secondary'
                }`}
              >
                {completedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Pet filtre çipleri — yalnızca birden fazla pet varsa */}
      {multiPet && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 py-1">
          <button
            type="button"
            onClick={() => setActivePetId(null)}
            aria-pressed={activePetId === null}
            className={`shrink-0 min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
              activePetId === null
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-text-secondary border-border-main hover:border-primary/30'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            Tümü
          </button>
          {pets.map(pet => {
            const on = activePetId === pet.id
            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => setActivePetId(pet.id)}
                aria-pressed={on}
                className={`shrink-0 min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                  on
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-text-secondary border-border-main hover:border-primary/30'
                }`}
              >
                <span className="w-4 h-4 rounded-full overflow-hidden bg-bg-main flex items-center justify-center text-xs shrink-0">
                  {pet.avatar_url
                    ? <Image src={pet.avatar_url} alt="" width={16} height={16} className="w-full h-full object-cover" />
                    : getSpeciesEmoji(pet.species)}
                </span>
                {pet.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Kategori filtresi & Bağlamsal Hızlı Planlama */}
      <div className="px-4 flex flex-col gap-2">
        <div className="flex gap-1 p-1 rounded-xl bg-surface-secondary/70 border border-border-main/60">
          {FILTERS.map(f => {
            const on = activeFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                aria-pressed={on}
                className={`flex-1 min-h-11 flex items-center justify-center text-xs font-semibold py-2.5 px-3 rounded-lg transition-all cursor-pointer ${
                  on ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {activeFilter !== 'tumu' && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-text-tertiary font-medium">
              {CATEGORY_STYLE[activeFilter]?.label} takvimi
            </span>
            <Link
              href={targetPlanUrl}
              prefetch={false}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {targetPlanLabel}
            </Link>
          </div>
        )}
      </div>

      {/* İçerik */}
      {currentCount === 0 ? (
        <div className="px-4 pt-2">
          <div className="rounded-card border border-dashed border-border-main bg-surface p-8 text-center flex flex-col items-center justify-center">
            {activeView === 'yaklasan' ? (
              <>
                <CalendarCheck className="w-8 h-8 text-success mb-2" />
                <p className="text-sm font-semibold text-text-primary">Planlanmış görev yok</p>
                <p className="text-xs text-text-secondary mt-1">
                  {activeFilter === 'tumu'
                    ? 'Bu dönem için planlanmış bir görev görünmüyor.'
                    : `Bu dönem için planlanmış ${CATEGORY_STYLE[activeFilter]?.label.toLowerCase()} görevi görünmüyor.`}
                </p>
                <Link
                  href={targetPlanUrl}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center justify-center gap-2 mt-4 px-4 py-2.5 rounded-full border border-primary text-primary text-xs font-bold hover:bg-primary-soft transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  {targetPlanLabel}
                </Link>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-8 h-8 text-text-tertiary mb-2" />
                <p className="text-sm font-semibold text-text-primary">Tamamlanan görev yok</p>
                <p className="text-xs text-text-secondary mt-1">
                  {activeFilter === 'tumu'
                    ? 'Son 30 gün içinde tamamlanmış bir görev kaydı bulunmuyor.'
                    : `Son 30 gün içinde tamamlanmış ${CATEGORY_STYLE[activeFilter]?.label.toLowerCase()} kaydı bulunmuyor.`}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 flex flex-col">
          {currentBucketKeys.map(key => {
            const list = buckets[key]
            if (list.length === 0) return null
            const meta = BUCKET_META[key]
            return (
              <section key={key} className="flex flex-col">
                <h2
                  className={`text-xs font-bold uppercase tracking-wider mt-4 mb-2 flex items-center gap-2 ${
                    meta.overdue ? 'text-error' : meta.isCompleted ? 'text-[#166534]' : 'text-text-tertiary'
                  }`}
                >
                  {meta.overdue && <AlertTriangle className="w-4 h-4 text-error" />}
                  {meta.isCompleted && <CheckCircle2 className="w-4 h-4 text-success" />}
                  {meta.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold tracking-normal ${
                      meta.overdue
                        ? 'bg-error/10 text-error'
                        : meta.isCompleted
                        ? 'bg-[#F0FDF4] text-[#166534]'
                        : 'bg-surface-secondary text-text-secondary'
                    }`}
                  >
                    {meta.isCompleted ? 'Yapıldı' : list.length}
                  </span>
                </h2>
                <div className="flex flex-col gap-2">
                  {list.map(ev => (
                    <EventRow key={`${ev.type}-${ev.id}`} event={ev} showPet={!activePetId} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventRow({ event, showPet }: { event: CalendarEvent; showPet: boolean }) {
  const cat = toCategory(event)
  const style = CATEGORY_STYLE[cat]
  const diff = dayDiff(event.date)
  const isCompleted = event.status === 'done' || event.status === 'completed'
  const isOverdue = diff < 0 && !isCompleted

  const href = event.pet_id ? `/owner/pets/${event.pet_id}` : '/owner/dashboard'

  let badge: { text: string; cls: string }
  if (isCompleted) {
    badge = { text: 'Yapıldı', cls: 'bg-[#F0FDF4] text-[#166534]' }
  } else if (isOverdue) {
    badge = { text: `${Math.abs(diff)} gün`, cls: 'bg-error/10 text-error' }
  } else if (diff === 0) {
    badge = { text: 'Bugün', cls: 'bg-primary-soft text-primary' }
  } else if (diff <= 7) {
    badge = { text: 'Yaklaşan', cls: 'bg-warning/10 text-warning' }
  } else {
    badge = { text: 'Planlı', cls: 'bg-surface-secondary text-text-secondary' }
  }

  return (
    <Link
      href={href}
      className="relative overflow-hidden min-h-11 rounded-card bg-surface/90 backdrop-blur-xl border border-white shadow-soft hover:shadow-medium hover:border-primary/10 transition-all duration-300 active:scale-[0.98] flex items-center gap-3 p-3"
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: style.fg }} aria-hidden="true" />

      <span
        className="w-8 h-8 ml-0.5 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: style.bg, color: style.fg }}
        aria-hidden="true"
      >
        <CategoryIcon category={cat} size={16} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate leading-tight">{event.title}</p>
        <p className="text-xs text-text-secondary font-medium truncate mt-0.5">
          {showPet && event.pet_name ? `${event.pet_name} · ` : ''}
          {formatDate(event.date)}
          {event.assignee_name ? ` · ${event.assignee_name}` : ''}
        </p>
      </div>

      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${badge.cls}`}>
        {badge.text}
      </span>
    </Link>
  )
}
