'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'
import CoachMark from '@/components/ui/CoachMark'
import TransferPrimaryOwnerModal from '@/components/pets/family/TransferPrimaryOwnerModal'

const ROLE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  primary_owner: { label: 'Birincil Sahip', color: 'bg-purple-100 text-purple-700', desc: 'Tam sahiplik & yetki' },
  co_owner:      { label: 'Ortak Sahip',   color: 'bg-indigo-100 text-indigo-700', desc: 'Tam yönetim yetkisi' },
  owner:         { label: 'Sahip',         color: 'bg-purple-100 text-purple-700', desc: 'Tam yetki' },
  admin:         { label: 'Admin',         color: 'bg-blue-100 text-blue-700',     desc: 'Sağlık & vet yönetimi' },
  editor:        { label: 'Editör',        color: 'bg-green-100 text-green-700',   desc: 'Görev tamamlama & log' },
  viewer:        { label: 'Görüntüleyici', color: 'bg-gray-100 text-gray-600', desc: 'Salt okunur' },
}

const PLAN_LIMITS: Record<string, number> = { free: 2, pro: 5, ai_plus: 999 }

export default function FamilyTab({ petId, petName, plan, initialSos }: { petId: string; petName: string; plan: string; initialSos?: any[] }) {
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [canManageCaregivers, setCanManageCaregivers] = useState(false)
  const [currentUserCanonicalRole, setCurrentUserCanonicalRole] = useState<string | null>(null)
  const [transferTarget, setTransferTarget] = useState<any | null>(null)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)

  const [inviteToCancel, setInviteToCancel] = useState<string | null>(null)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function cancelInvite(inviteId: string) {
    const res = await fetch('/api/pets/family', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_id: inviteId, pet_id: petId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setInviteMsg({ type: 'err', text: data.error ?? 'Davet iptal edilemedi.' })
      setInviteToCancel(null)
      return
    }
    setInvites(prev => prev.filter(i => i.id !== inviteId))
    setInviteToCancel(null)
    setInviteMsg({ type: 'ok', text: 'Davet iptal edildi.' })
  }

  async function leaveTeam() {
    const res = await fetch('/api/pets/family', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', pet_id: petId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setInviteMsg({ type: 'err', text: data.error ?? 'Ekipten ayrılamadınız.' })
      setIsLeaveModalOpen(false)
      return
    }
    router.push('/owner/dashboard')
  }

  async function load() {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pets/family?pet_id=${petId}`)
      const data = await res.json()
      setMembers(data.members ?? [])
      setInvites(data.invites ?? [])
      setActivity(data.activity ?? [])
      setCanManageCaregivers(data.canManageCaregivers === true)
      setCurrentUserCanonicalRole(data.currentUserCanonicalRole ?? null)
      setLoaded(true)
    } finally { setLoading(false) }
  }

  if (!loaded && !loading) { load() }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    setInviteLink(null)
    setCopied(false)
    try {
      const res = await fetch('/api/pets/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_id: petId, email, role }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteMsg({ type: 'err', text: data.error }); return }
      setInviteMsg({ type: 'ok', text: data.message })
      if (data.inviteLink) setInviteLink(data.inviteLink)
      setEmail('')
      setLoaded(false)
    } finally { setInviting(false) }
  }

  async function copyLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const input = document.getElementById('invite-link-input') as HTMLInputElement
      if (input) { input.select(); document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2500) }
    }
  }

  async function removeMember(memberId: string) {
    const res = await fetch('/api/pets/family', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, pet_id: petId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setInviteMsg({
        type: 'err',
        text: data.error ?? 'Üye kaldırılamadı.',
      })
      setMemberToRemove(null)
      return
    }
    setMembers(prev => prev.filter(m => m.id !== memberId))
    setMemberToRemove(null)
  }

  async function changeMemberRole(profileId: string, nextRole: string) {
    setUpdatingMemberId(profileId)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/pets/family', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_role',
          pet_id: petId,
          profile_id: profileId,
          role: nextRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteMsg({
          type: 'err',
          text: data.error ?? 'Üye rolü değiştirilemedi.',
        })
        return
      }
      setLoaded(false)
    } finally {
      setUpdatingMemberId(null)
    }
  }

  const limit = PLAN_LIMITS[plan] ?? 2

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between p-4 rounded-sm bg-bg-main border border-border-main">
        <div>
          <p className="text-[13px] font-bold text-text-primary">
            {members.length} / {limit === 999 ? '∞' : limit} Üye Slotu
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {plan === 'free' ? 'Pro\'ya geçerek 5 üyeye kadar davet et' : plan === 'pro' ? 'AI+ ile sınırsız üye' : 'Sınırsız üye (AI+)'}
          </p>
        </div>
        {plan === 'free' && (
          <a href="/owner/profile/subscription" className="btn-primary text-[12px] py-2 px-3 shrink-0">Yükselt</a>
        )}
      </div>

      {/* Members List */}
      <div className="card-base overflow-hidden">
        <div className="px-5 py-3 bg-bg-main border-b border-border-main flex items-center justify-between">
          <h3 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Bakım Ekibi</h3>
          <div className="flex items-center gap-2">
            {canManageCaregivers && (
              <button
                type="button"
                onClick={() => setShowInviteForm(prev => !prev)}
                className="px-3 py-1.5 text-[12px] font-bold text-primary bg-primary-soft hover:bg-primary/20 rounded-xl transition-all flex items-center gap-1 shadow-xs"
              >
                <span>{showInviteForm ? '✕ Kapat' : '+ Üye Davet Et'}</span>
              </button>
            )}
            {currentUserCanonicalRole && currentUserCanonicalRole !== 'primary_owner' && (
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(true)}
                className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
              >
                <span>🚪</span> Ekipten Ayrıl
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[13px] text-text-secondary font-medium">Bakım ekibi yükleniyor...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center flex flex-col items-center justify-center gap-2 bg-bg-main/30">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shadow-xs mb-1">
              👨‍👩‍👧‍👦
            </div>
            <p className="text-[14px] text-text-primary font-bold">Henüz Bakım Ekibi Üyesi Yok</p>
            <p className="text-[12px] text-text-secondary/80 max-w-sm leading-relaxed">
              Aile üyelerinizi, eşinizi veya bakıcınızı davet ederek {petName} dostunuzun bakımını birlikte yönetebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-main">
            {members.map((m: any) => {
              const displayRole = m.canonical_role || m.role
              const roleInfo = ROLE_LABELS[displayRole] ?? ROLE_LABELS.viewer
              const memberName =
                [m.profiles?.first_name, m.profiles?.last_name]
                  .filter(Boolean)
                  .join(' ')
                || (m.canonical_role === 'primary_owner' || m.role === 'owner' ? 'Pet sahibi' : 'Ekip üyesi')
              const initials = memberName
                .split(' ')
                .map((part: string) => part[0])
                .join('')
                .slice(0, 2)

              return (
                <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-bg-main/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary font-black text-[14px] shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-[14px]">
                      {memberName}
                    </p>
                    <p className="text-[11px] text-text-secondary">{roleInfo.desc}</p>
                  </div>

                  {canManageCaregivers && displayRole !== 'primary_owner' && displayRole !== 'owner' ? (
                    <select
                      aria-label={`${memberName} rolü`}
                      value={m.role === 'owner' ? 'owner' : m.role}
                      disabled={updatingMemberId === m.profile_id}
                      onChange={(event) =>
                        changeMemberRole(m.profile_id, event.target.value)
                      }
                      className="input-base h-9 w-auto min-w-[126px] py-1.5 text-[11px] font-bold"
                    >
                      <option value="owner">Ortak Sahip (co_owner)</option>
                      <option value="admin">Admin</option>
                      <option value="editor">Editör</option>
                      <option value="viewer">Görüntüleyici</option>
                    </select>
                  ) : (
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  )}

                  {currentUserCanonicalRole === 'primary_owner' && m.canonical_role === 'co_owner' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTransferTarget({
                          profile_id: m.profile_id,
                          first_name: m.profiles?.first_name,
                          last_name: m.profiles?.last_name,
                          email: m.email,
                        })
                        setIsTransferModalOpen(true)
                      }}
                      className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition border border-purple-200 shrink-0"
                      title="Birincil Sahipliği Devret"
                    >
                      👑 Sahipliği Devret
                    </button>
                  )}

                  {canManageCaregivers && displayRole !== 'primary_owner' && displayRole !== 'owner' && (
                    <button
                      onClick={() => setMemberToRemove(m.id)}
                      className="text-text-secondary hover:text-error transition-colors ml-1"
                      title="Kaldır"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="card-base overflow-hidden">
          <div className="px-5 py-3 bg-bg-main border-b border-border-main">
            <h3 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Bekleyen Davetler</h3>
          </div>
          <div className="divide-y divide-border-main">
            {invites.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-[18px] shrink-0">✉️</div>
                <div className="flex-1">
                  <p className="font-bold text-text-primary text-[14px]">{inv.email}</p>
                  <p className="text-[11px] text-text-secondary">
                    {new Date(inv.expires_at).toLocaleDateString('tr-TR')} tarihine kadar geçerli
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Bekliyor</span>
                  {canManageCaregivers && (
                    <button
                      type="button"
                      onClick={() => setInviteToCancel(inv.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors shrink-0"
                    >
                      İptal Et
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Form (Collapsible) */}
      {canManageCaregivers && (showInviteForm || inviteLink || inviteMsg?.type === 'err') && (
        <div className="card-base p-5 animate-fade-in border-2 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Üye Davet Et</h3>
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              className="text-[11px] font-bold text-text-secondary hover:text-text-primary px-2 py-1 rounded-lg hover:bg-bg-main"
            >
              ✕ Gizle
            </button>
          </div>
          {inviteMsg && (
            <div className={`p-3 rounded-xs text-[13px] font-medium mb-4 ${inviteMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {inviteMsg.text}
            </div>
          )}
          {inviteLink && (
            <div className="p-3 rounded-xs bg-blue-50 border border-blue-200 mb-4">
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-2">📎 Davet Bağlantısı</p>
              <div className="flex gap-2">
                <input
                  id="invite-link-input"
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 input-base text-[12px] bg-white/80 select-all"
                  onFocus={e => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className={`shrink-0 px-3 py-2 rounded-btn text-[12px] font-bold transition-all duration-200 ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {copied ? '✓ Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <p className="text-[10px] text-blue-500 mt-1.5">Bu bağlantıyı davet ettiğiniz kişiye gönderin.</p>
            </div>
          )}
          <form onSubmit={sendInvite} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">E-posta Adresi</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="input-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Rol</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="input-base">
                <option value="admin">Admin — Sağlık & Vet yönetimi</option>
                <option value="editor">Editör — Günlük bakım görevleri</option>
                <option value="viewer">Görüntüleyici — Salt okunur</option>
              </select>
            </div>
            <button type="submit" disabled={inviting} className="btn-primary py-3 text-[14px] mt-1">
              {inviting ? 'Gönderiliyor...' : `${petName}'nin ekibine davet et →`}
            </button>
          </form>
        </div>
      )}

      {/* Activity Feed */}
      {activity.length > 0 && (
        <div className="card-base overflow-hidden">
          <div className="px-5 py-3 bg-bg-main border-b border-border-main">
            <h3 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Ekip Aktivitesi</h3>
          </div>
          <div className="divide-y divide-border-main">
            {activity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-[13px] shrink-0 mt-0.5">
                  {a.profiles?.first_name?.[0] ?? '?'}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-text-primary">{a.description}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{new Date(a.created_at).toLocaleString('tr-TR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral Growth Hook */}
      <div className="p-4 rounded-sm bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 text-center">
        <p className="text-[14px] font-bold text-text-primary mb-1">🎁 Davet Ödülü</p>
        <p className="text-[12px] text-text-secondary">
          Davet ettiğin kişi kabul edince <strong className="text-primary">+50 Care Point</strong> kazanırsın!
        </p>
      </div>

      <ConfirmModal
        open={canManageCaregivers && !!memberToRemove}
        title="Üyeyi Kaldır"
        message="Bu üyeyi ekipten kaldırmak istediğinize emin misiniz?"
        confirmLabel="Evet, Kaldır"
        cancelLabel="İptal"
        variant="danger"
        onConfirm={() => memberToRemove && removeMember(memberToRemove)}
        onCancel={() => setMemberToRemove(null)}
      />

      <ConfirmModal
        open={canManageCaregivers && !!inviteToCancel}
        title="Daveti İptal Et"
        message="Bu daveti iptal etmek istediğinize emin misiniz? Davet edilen kişi artık bağlantı üzerinden ekibe katılamayacaktır."
        confirmLabel="Evet, Daveti İptal Et"
        cancelLabel="Vazgeç"
        variant="danger"
        onConfirm={() => inviteToCancel && cancelInvite(inviteToCancel)}
        onCancel={() => setInviteToCancel(null)}
      />

      <ConfirmModal
        open={isLeaveModalOpen}
        title="Bakım Ekibinden Ayrıl"
        message={`${petName} dostumuzun bakım ekibinden ayrılmak istediğinize emin misiniz? Bu işlem sonucunda pet erişiminiz sonlanacaktır.`}
        confirmLabel="Evet, Ekipten Ayrıl"
        cancelLabel="Vazgeç"
        variant="danger"
        onConfirm={leaveTeam}
        onCancel={() => setIsLeaveModalOpen(false)}
      />

      <TransferPrimaryOwnerModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false)
          setTransferTarget(null)
        }}
        petId={petId}
        petName={petName}
        targetMember={transferTarget}
        onSuccess={() => {
          setLoaded(false)
        }}
      />
    </div>
  )
}
