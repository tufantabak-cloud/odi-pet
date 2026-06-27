'use client'

import { useState } from 'react'

interface Props {
  userId: string
  currentRole: string
  actorRole: string // 'admin' | 'founder'
}

const ROLES = [
  { value: 'owner',   label: 'Owner',   emoji: '🐾', desc: 'Standard pet owner' },
  { value: 'vet',     label: 'Vet',     emoji: '🩺', desc: 'Veterinarian / clinic staff' },
  { value: 'admin',   label: 'Admin',   emoji: '🔑', desc: 'Platform administrator' },
  { value: 'founder', label: 'Founder', emoji: '👑', desc: 'Highest privilege (founder only)' },
]

export default function RoleChangeForm({ userId, currentRole, actorRole }: Props) {
  const [selected, setSelected] = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const canSubmit = selected !== currentRole && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selected }),
      })
      const json = await res.json()
      if (!res.ok) {
        setStatus({ ok: false, msg: json.error ?? 'Bir hata oluştu.' })
      } else {
        setStatus({ ok: true, msg: `Rol başarıyla "${selected}" olarak güncellendi.` })
      }
    } catch {
      setStatus({ ok: false, msg: 'Bağlantı hatası.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {ROLES.map((r) => {
          const isDisabled = r.value === 'founder' && actorRole !== 'founder'
          const isSelected = selected === r.value
          return (
            <label
              key={r.value}
              htmlFor={`role-option-${r.value}`}
              className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed border-border-main bg-bg-main'
                  : isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border-main bg-surface hover:border-primary/40'
              }`}
            >
              <input
                id={`role-option-${r.value}`}
                type="radio"
                name="role"
                value={r.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => !isDisabled && setSelected(r.value)}
                className="sr-only"
              />
              <span className="text-xl mt-0.5">{r.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] text-text-primary">{r.label}</div>
                <div className="text-[11px] text-text-secondary mt-0.5">{r.desc}</div>
              </div>
              {isSelected && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-[9px] font-black">✓</span>
                </span>
              )}
            </label>
          )
        })}
      </div>

      {actorRole !== 'founder' && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Founder rolü yalnızca bir Founder tarafından atanabilir.
        </p>
      )}

      {status && (
        <div
          role="alert"
          aria-live="assertive"
          className={`rounded-xl px-4 py-3 text-[13px] font-semibold border ${
            status.ok
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {status.ok ? '✅' : '❌'} {status.msg}
        </div>
      )}

      <button
        id="role-change-submit"
        type="submit"
        disabled={!canSubmit}
        className="btn-primary w-full py-3 text-[14px]"
      >
        {loading ? 'Güncelleniyor…' : 'Rolü Güncelle'}
      </button>
    </form>
  )
}
