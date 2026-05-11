'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  owner:  { label: 'Sahip',   color: 'bg-purple-100 text-purple-700', desc: 'Tam yetki' },
  admin:  { label: 'Admin',   color: 'bg-blue-100 text-blue-700',     desc: 'Sağlık & vet yönetimi' },
  editor: { label: 'Editör',  color: 'bg-green-100 text-green-700',   desc: 'Görev tamamlama & log' },
  viewer: { label: 'Görüntüleyici', color: 'bg-gray-100 text-gray-600', desc: 'Salt okunur' },
}

const PLAN_LIMITS: Record<string, number> = { free: 2, pro: 5, ai_plus: 999 }

export default function FamilyTab({ petId, petName, plan, initialSos }: { petId: string; petName: string; plan: string; initialSos?: any[] }) {
  const router = useRouter()
  const [members, setMembers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // SOS State
  const [sosContacts, setSosContacts] = useState<any[]>(initialSos && initialSos.length > 0 ? initialSos : [
    { name: '', phone: '', role: 'primary' },
    { name: '', phone: '', role: 'secondary' }
  ])
  const [savingSos, setSavingSos] = useState(false)

  async function load() {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pets/family?pet_id=${petId}`)
      const data = await res.json()
      setMembers(data.members ?? [])
      setInvites(data.invites ?? [])
      setActivity(data.activity ?? [])
      setLoaded(true)
    } finally { setLoading(false) }
  }

  if (!loaded && !loading) { load() }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/pets/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_id: petId, email, role }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteMsg({ type: 'err', text: data.error }); return }
      setInviteMsg({ type: 'ok', text: data.message })
      setEmail('')
      setLoaded(false)
    } finally { setInviting(false) }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Bu üyeyi kaldırmak istediğinize emin misiniz?')) return
    await fetch('/api/pets/family', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, pet_id: petId }),
    })
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  async function saveSos(e: React.FormEvent) {
    e.preventDefault()
    setSavingSos(true)
    try {
      const res = await fetch(`/api/pets/${petId}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sos_contacts: sosContacts }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'SOS güncellenirken hata oluştu'); return }
      alert('Acil durum ağı başarıyla güncellendi!')
      router.refresh()
    } catch (err) {
      alert('Bir hata oluştu.')
    } finally { setSavingSos(false) }
  }

  const limit = PLAN_LIMITS[plan] ?? 2

  return (
    <div className="flex flex-col gap-5">
      
      {/* ── SOS & Aile Smart Card ── */}
      <div className="p-5 bg-gradient-to-br from-error/10 to-error/5 border-2 border-error/20 rounded-[24px] flex flex-col gap-4 relative overflow-hidden group shadow-sm animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-full blur-3xl" />
        <div className="flex items-start gap-4 relative z-10 pr-2">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[24px] shrink-0 border border-error/10">🚨</div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${sosContacts.every(c => c.phone) ? 'bg-green-500' : 'bg-error animate-pulse'}`} />
              <p className={`text-[11px] font-black uppercase tracking-widest ${sosContacts.every(c => c.phone) ? 'text-green-600' : 'text-error'}`}>
                {sosContacts.every(c => c.phone) ? 'SOS Modu Hazır' : 'SOS Modu Yapılandırılmadı'}
              </p>
            </div>
            <p className="text-[15px] font-extrabold text-text-primary leading-snug">{petName} İçin Acil Durum Ağı</p>
            <p className="text-[13px] font-medium text-text-secondary mt-1.5 leading-relaxed">
              Kayıp veya kaza gibi acil durumlarda size ulaşılamazsa güvenebileceğimiz kişileri (Ad-Soyad ve Telefon) belirleyin.
            </p>
          </div>
        </div>

        <form className="flex flex-col gap-4 mt-1 relative z-10 p-4 bg-white/50 rounded-xl border border-error/10" onSubmit={saveSos}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact 1 */}
            <div className="flex flex-col gap-3 p-3 bg-white/40 rounded-xl border border-error/5">
              <p className="text-[10px] font-black text-error uppercase tracking-widest">Kişi 1 (Birincil)</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">Ad Soyad</label>
                <input 
                  type="text" 
                  className="input-base text-[13px] py-2" 
                  placeholder="Ad Soyad" 
                  value={sosContacts[0]?.name || ''}
                  onChange={e => {
                    const newContacts = [...sosContacts];
                    newContacts[0] = { ...newContacts[0], name: e.target.value };
                    setSosContacts(newContacts);
                  }}
                  required 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">Telefon</label>
                <input 
                  type="tel" 
                  className="input-base text-[13px] py-2" 
                  placeholder="05XX XXX XX XX" 
                  value={sosContacts[0]?.phone || ''}
                  onChange={e => {
                    const newContacts = [...sosContacts];
                    newContacts[0] = { ...newContacts[0], phone: e.target.value };
                    setSosContacts(newContacts);
                  }}
                  required 
                />
              </div>
            </div>

            {/* Contact 2 */}
            <div className="flex flex-col gap-3 p-3 bg-white/40 rounded-xl border border-error/5">
              <p className="text-[10px] font-black text-error uppercase tracking-widest">Kişi 2 (İsteğe Bağlı)</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">Ad Soyad</label>
                <input 
                  type="text" 
                  className="input-base text-[13px] py-2" 
                  placeholder="Ad Soyad" 
                  value={sosContacts[1]?.name || ''}
                  onChange={e => {
                    const newContacts = [...sosContacts];
                    newContacts[1] = { ...newContacts[1], name: e.target.value };
                    setSosContacts(newContacts);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary">Telefon</label>
                <input 
                  type="tel" 
                  className="input-base text-[13px] py-2" 
                  placeholder="05XX XXX XX XX" 
                  value={sosContacts[1]?.phone || ''}
                  onChange={e => {
                    const newContacts = [...sosContacts];
                    newContacts[1] = { ...newContacts[1], phone: e.target.value };
                    setSosContacts(newContacts);
                  }}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={savingSos} className="btn-primary bg-error hover:bg-error/90 border-none py-3 text-[14px] mt-1 shadow-sm w-full sm:w-auto self-start px-8">
            {savingSos ? 'Kaydediliyor...' : 'Acil Durum Ağını Güncelle'}
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-bg-main border border-border-main">
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
        <div className="px-5 py-3 bg-bg-main border-b border-border-main">
          <h3 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Bakım Ekibi</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-text-secondary text-[14px]">Yükleniyor...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-text-secondary text-[14px]">Henüz üye yok</div>
        ) : (
          <div className="divide-y divide-border-main">
            {members.map((m: any) => {
              const roleInfo = ROLE_LABELS[m.role] ?? ROLE_LABELS.viewer
              const initials = `${m.profiles?.first_name?.[0] ?? ''}${m.profiles?.last_name?.[0] ?? ''}` || '?'
              return (
                <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-bg-main/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary font-black text-[14px] shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-[14px]">
                      {m.profiles?.first_name} {m.profiles?.last_name}
                    </p>
                    <p className="text-[11px] text-text-secondary">{roleInfo.desc}</p>
                  </div>
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
                  {m.role !== 'owner' && (
                    <button onClick={() => removeMember(m.id)} className="text-text-secondary hover:text-error transition-colors ml-1" title="Kaldır">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Bekliyor</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Form */}
      <div className="card-base p-5">
        <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Üye Davet Et</h3>
        {inviteMsg && (
          <div className={`p-3 rounded-lg text-[13px] font-medium mb-4 ${inviteMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {inviteMsg.text}
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

      {/* Activity Feed */}
      {activity.length > 0 && (
        <div className="card-base overflow-hidden">
          <div className="px-5 py-3 bg-bg-main border-b border-border-main">
            <h3 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Ekip Aktivitesi</h3>
          </div>
          <div className="divide-y divide-border-main">
            {activity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-primary font-bold text-[12px] shrink-0 mt-0.5">
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
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 text-center">
        <p className="text-[14px] font-bold text-text-primary mb-1">🎁 Davet Ödülü</p>
        <p className="text-[12px] text-text-secondary">
          Davet ettiğin kişi kabul edince <strong className="text-primary">+50 Care Point</strong> kazanırsın!
        </p>
      </div>
    </div>
  )
}
