'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  assigned:   { label: 'Bekliyor',     color: 'bg-amber-100 text-amber-700' },
  accepted:   { label: 'Kabul Edildi', color: 'bg-blue-100 text-blue-700' },
  declined:   { label: 'Reddedildi',   color: 'bg-red-100 text-red-700' },
  completed:  { label: 'Tamamlandı',   color: 'bg-green-100 text-green-700' },
  overdue:    { label: 'Gecikmiş',     color: 'bg-red-100 text-red-700' },
  reassigned: { label: 'Yeniden Atandı', color: 'bg-gray-100 text-gray-600' },
}

const NOTIF_ICONS: Record<string, string> = {
  task_assigned: '📋',
  task_due: '⏰',
  task_overdue: '🚨',
  task_accepted: '✅',
  task_declined: '❌',
  task_completed: '🎉',
  invite_accepted: '🤝',
}

const DECLINE_REASONS = ['Müsait değilim', 'Meşgulüm', 'Bu benim sorumluluğum değil']

export default function MyTasksClient({ tasks, notifications }: { tasks: any[]; notifications: any[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tasks' | 'notifications'>('tasks')
  const [localTasks, setLocalTasks] = useState(tasks)
  const [localNotifs, setLocalNotifs] = useState(notifications)
  const [declining, setDeclining] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0])
  const [loading, setLoading] = useState<string | null>(null)

  const unread = localNotifs.filter(n => !n.is_read).length

  async function handleAction(scheduleId: string, petId: string, action: 'accept' | 'decline' | 'complete', reason?: string) {
    setLoading(scheduleId + action)
    try {
      const res = await fetch('/api/tasks/assign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: scheduleId, action, decline_reason: reason }),
      })
      if (res.ok) {
        setLocalTasks(prev => prev.map(t =>
          t.id === scheduleId ? { ...t, assignment_status: action === 'accept' ? 'accepted' : action === 'complete' ? 'completed' : 'declined' } : t
        ))
        if (action === 'complete') {
          setTimeout(() => setLocalTasks(prev => prev.filter(t => t.id !== scheduleId)), 800)
        }
        setDeclining(null)
        router.refresh()
      }
    } finally { setLoading(null) }
  }

  async function markAllRead() {
    const supabase = (await import('@/lib/supabase/client')).createBrowserSupabaseClient()
    await supabase.from('pet_notifications').update({ is_read: true }).eq('is_read', false)
    setLocalNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const overdueCount = localTasks.filter(t => new Date(t.due_date) < new Date() && t.assignment_status !== 'completed').length
  const todayCount = localTasks.filter(t => {
    const d = new Date(t.due_date); const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  return (
    <div className="flex flex-col gap-6 pb-20 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Görevlerim</h1>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
          {overdueCount > 0 && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold">{overdueCount} Gecikmiş</span>}
          {todayCount > 0 && <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">{todayCount} Bugün</span>}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-bg-main p-1 rounded-2xl border border-border-main">
        <button onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'tasks' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>
          Görevler ({localTasks.length})
        </button>
        <button onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all relative ${activeTab === 'notifications' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>
          Bildirimler
          {unread > 0 && <span className="absolute top-1 right-3 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{unread}</span>}
        </button>
      </div>

      {/* ── Tasks Tab ── */}
      {activeTab === 'tasks' && (
        <div className="flex flex-col gap-3">
          {localTasks.length === 0 ? (
            <div className="card-base p-10 text-center">
              <p className="text-[32px] mb-3">🎉</p>
              <p className="font-bold text-text-primary text-[16px]">Atanmış görev yok</p>
              <p className="text-text-secondary text-[13px] mt-1">Tüm görevler tamamlandı veya henüz görev atanmadı.</p>
            </div>
          ) : (
            localTasks.map(task => {
              const daysLeft = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000)
              const isOverdue = daysLeft < 0
              const statusInfo = STATUS_CONFIG[task.assignment_status] ?? STATUS_CONFIG.assigned
              const isCompleting = loading === task.id + 'complete'

              return (
                <div key={task.id} className={`card-base p-5 border-l-4 ${isOverdue ? 'border-l-red-400' : daysLeft <= 3 ? 'border-l-amber-400' : 'border-l-primary'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-text-primary text-[15px]">{task.title || task.vaccines?.name || 'Bakım Görevi'}</p>
                      <p className="text-[12px] text-text-secondary mt-0.5">
                        {task.pets?.name} • {task.pets?.species}
                      </p>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-lg ${isOverdue ? 'bg-red-50 text-red-700' : daysLeft === 0 ? 'bg-amber-50 text-amber-700' : 'bg-bg-main text-text-secondary'}`}>
                      {isOverdue ? `${Math.abs(daysLeft)} gün gecikmiş` : daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün kaldı`}
                    </span>
                    <span className="text-[12px] text-text-secondary">{new Date(task.due_date).toLocaleDateString('tr-TR')}</span>
                  </div>

                  {/* Action buttons */}
                  {task.assignment_status === 'assigned' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(task.id, task.pet_id, 'accept')}
                        disabled={!!loading}
                        className="btn-primary text-[13px] py-2 px-4 flex-1">
                        ✓ Kabul Et
                      </button>
                      <button
                        onClick={() => setDeclining(task.id)}
                        className="btn-secondary text-[13px] py-2 px-4">
                        Reddet
                      </button>
                    </div>
                  )}
                  {task.assignment_status === 'accepted' && (
                    <button
                      onClick={() => handleAction(task.id, task.pet_id, 'complete')}
                      disabled={isCompleting}
                      className="btn-primary w-full text-[13px] py-2.5">
                      {isCompleting ? 'Tamamlanıyor...' : '🎉 Tamamlandı Olarak İşaretle (+10 CP)'}
                    </button>
                  )}

                  {/* Decline modal inline */}
                  {declining === task.id && (
                    <div className="mt-3 p-4 bg-bg-main rounded-xl border border-border-main">
                      <p className="text-[13px] font-bold text-text-primary mb-2">Red Sebebi</p>
                      <select value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="input-base text-[13px] mb-3">
                        {DECLINE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(task.id, task.pet_id, 'decline', declineReason)}
                          className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-[13px] transition-colors">
                          Onayla
                        </button>
                        <button onClick={() => setDeclining(null)}
                          className="flex-1 py-2 btn-secondary text-[13px]">
                          İptal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Notifications Tab ── */}
      {activeTab === 'notifications' && (
        <div className="flex flex-col gap-3">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-primary text-[13px] font-bold text-right hover:underline">
              Tümünü okundu işaretle
            </button>
          )}
          {localNotifs.length === 0 ? (
            <div className="card-base p-10 text-center">
              <p className="text-[32px] mb-3">🔔</p>
              <p className="font-bold text-text-primary">Henüz bildirim yok</p>
            </div>
          ) : (
            <div className="card-base divide-y divide-border-main overflow-hidden">
              {localNotifs.map(notif => (
                <div key={notif.id} className={`flex items-start gap-4 p-4 transition-colors ${!notif.is_read ? 'bg-primary/5' : 'hover:bg-bg-main/50'}`}>
                  <span className="text-[22px] shrink-0 mt-0.5">{NOTIF_ICONS[notif.type] ?? '🔔'}</span>
                  <div className="flex-1">
                    <p className={`text-[14px] ${!notif.is_read ? 'font-bold text-text-primary' : 'font-semibold text-text-primary'}`}>{notif.title}</p>
                    {notif.body && <p className="text-[12px] text-text-secondary mt-0.5">{notif.body}</p>}
                    <p className="text-[11px] text-text-secondary mt-1">{new Date(notif.created_at).toLocaleString('tr-TR')}</p>
                  </div>
                  {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5"/>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
