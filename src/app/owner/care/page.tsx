import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const ROUTINE_TASKS = [
  { key: 'grooming',  label: 'Tüy Tarama',   icon: '🐾', freq: 'Günlük' },
  { key: 'nail_trim', label: 'Tırnak Kesimi', icon: '✂️', freq: 'Haftalık' },
  { key: 'bath',      label: 'Banyo',         icon: '🚿', freq: '2 Haftada 1' },
  { key: 'checkup',   label: 'Genel Kontrol', icon: '🩺', freq: 'Aylık' },
]

export default async function CarePage({ searchParams }: { searchParams: Promise<{ pet?: string }> }) {
  const user = await getSessionUser()
  const { pet: petId } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: pets } = await supabase.from('pets').select('id, name').eq('owner_id', user?.id)
  const activePetId = petId ?? pets?.[0]?.id

  // Son yapılan bakım eventleri
  const { data: recentEvents } = activePetId
    ? await supabase
        .from('care_events')
        .select('event_type, performed_at')
        .eq('pet_id', activePetId)
        .order('performed_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const lastDoneMap: Record<string, string> = {}
  recentEvents?.forEach(ev => {
    if (!lastDoneMap[ev.event_type]) lastDoneMap[ev.event_type] = ev.performed_at
  })

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Bakım</h1>
        <p className="text-text-secondary mt-1 text-[16px] font-medium">Günlük rutin bakım takibi</p>
      </div>

      {/* Pet Switcher */}
      {pets && pets.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {pets.map(p => (
            <a key={p.id} href={`/owner/care?pet=${p.id}`}
              className={`px-4 py-2 rounded-full text-[13px] font-bold shrink-0 border transition-colors
                ${p.id === activePetId ? 'bg-primary text-white border-primary' : 'bg-surface border-border-main text-text-secondary'}`}>
              {p.name}
            </a>
          ))}
        </div>
      )}

      {/* Routine Tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {ROUTINE_TASKS.map(task => {
          const lastDone = lastDoneMap[task.key]
          const daysSince = lastDone
            ? Math.floor((Date.now() - new Date(lastDone).getTime()) / 86400000)
            : null

          return (
            <div key={task.key} className="card-base p-6 flex items-center gap-5">
              <div className="text-[36px] shrink-0">{task.icon}</div>
              <div className="flex flex-col flex-1">
                <p className="font-extrabold text-text-primary text-[16px]">{task.label}</p>
                <p className="text-[13px] text-text-secondary">{task.freq}</p>
                {daysSince !== null && (
                  <p className="text-[12px] font-bold text-success mt-1">✓ {daysSince === 0 ? 'Bugün yapıldı' : `${daysSince} gün önce yapıldı`}</p>
                )}
              </div>
              <button className="btn-secondary text-[12px] py-2 px-4 shrink-0">Tamamla</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
