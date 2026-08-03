import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import RoleChangeForm from './RoleChangeForm'
import DeleteUserButton from './DeleteUserButton'
import DeletePetButton from './DeletePetButton'
import QuickGrantUserButton from './QuickGrantUserButton'
import ProCountdownCard from './ProCountdownCard'
import SubscriptionCreditsLedger from './SubscriptionCreditsLedger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ageFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return '—'
  const diff = Date.now() - new Date(birthDate).getTime()
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  if (years < 1) {
    const months = Math.floor(diff / (30 * 24 * 3600 * 1000))
    return `${months} ay`
  }
  return `${years} yaş`
}

function RoleBadge({ role }: { role: string | null }) {
  const r = role ?? 'owner'
  const styleMap: Record<string, string> = {
    founder: 'bg-rose-100 text-rose-700 border-rose-200',
    admin:   'bg-amber-100 text-amber-700 border-amber-200',
    vet:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    owner:   'bg-violet-100 text-violet-700 border-violet-200',
  }
  const style = styleMap[r] ?? 'bg-bg-main text-text-secondary border-border-main'
  const emojiMap: Record<string, string> = { founder: '👑', admin: '🔑', vet: '🩺', owner: '🐾' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[12px] font-bold ${style}`}>
      {emojiMap[r] ?? '👤'} {r.charAt(0).toUpperCase() + r.slice(1)}
    </span>
  )
}

function SubBadge({ plan, status }: { plan: string | null; status: string | null }) {
  if (!plan || plan === 'free') {
    return <span className="text-[12px] text-text-secondary font-semibold">Ücretsiz</span>
  }
  const isActive = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[12px] font-bold ${
      isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {isActive ? '⭐' : '⏸'} {plan.toUpperCase()} {isActive ? '' : `(${status})`}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return notFound()

  const supabase = createAdminSupabaseClient()

  // Load profile with fallback if optional premium columns fail
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, phone, created_at, premium_until, pro_trial_until, premium_tier')
    .eq('id', id)
    .maybeSingle()

  if (!profile) {
    const { data: fallbackProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, phone, created_at, pro_trial_until')
      .eq('id', id)
      .maybeSingle()

    profile = fallbackProfile as any
  }

  if (profile) {
    profile.premium_until = profile.premium_until || (profile as any).pro_trial_until || null
  }

  // Load other details in parallel
  const [
    { data: pets },
    { data: subscriptionRaw },
    { data: events },
    { data: creditHistory },
  ] = await Promise.all([
    supabase
      .from('pets')
      .select('id, name, species, breed, birth_date, created_at')
      .eq('owner_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_subscriptions')
      .select('id, plan, status, created_at, current_period_end')
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('event_stream')
      .select('id, event, event_type, ts, created_at, payload, metadata')
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('membership_credits')
      .select('id, credit_days, reason, metadata, created_at')
      .eq('profile_id', id)
      .order('created_at', { ascending: false }),
  ])

  const subscription = subscriptionRaw ? {
    ...subscriptionRaw,
    ends_at: subscriptionRaw.current_period_end
  } : null

  if (!profile) return notFound()

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'İsimsiz Kullanıcı'
  const joined = new Date(profile.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Profile Completion Calculation
  let completionPct = 0
  if (profile.first_name) completionPct += 25
  if (profile.last_name) completionPct += 25
  if (profile.phone) completionPct += 25
  if ((pets ?? []).length > 0) completionPct += 25

  let completionColor = 'text-rose-600 bg-rose-50 border-rose-200'
  if (completionPct >= 50 && completionPct < 100) completionColor = 'text-amber-600 bg-amber-50 border-amber-200'
  else if (completionPct === 100) completionColor = 'text-emerald-600 bg-emerald-50 border-emerald-200'

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-text-secondary">
        <Link href="/admin" className="hover:text-primary transition-colors">Admin</Link>
        <span>›</span>
        <Link href="/admin/users" className="hover:text-primary transition-colors">Kullanıcılar</Link>
        <span>›</span>
        <span className="text-text-primary font-semibold">{fullName}</span>
      </div>

      {/* Header card */}
      <div className="card-base p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border-main flex items-center justify-center text-2xl font-black text-primary flex-shrink-0">
          {(profile.first_name?.[0] ?? profile.email?.[0] ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-text-primary">{fullName}</h1>
            <RoleBadge role={profile.role} />
          </div>
          <p className="text-[13px] text-text-secondary mt-1">{profile.email ?? '—'}</p>
          <div className="flex items-center gap-4 mt-2 flex-wrap text-[12px] text-text-secondary">
            <span>📅 Katıldı: {joined}</span>
            {profile.phone && <span>📞 {profile.phone}</span>}
            <span className="font-mono text-[10px] opacity-60">{profile.id}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pets */}
          <div className="card-base overflow-hidden">
            <div className="px-6 py-4 border-b border-border-main">
              <h2 className="font-black text-[15px] text-text-primary flex items-center gap-2">
                🐾 Evcil Hayvanlar
                <span className="text-[12px] font-semibold text-text-secondary ml-1">
                  ({(pets ?? []).length})
                </span>
              </h2>
            </div>
            {(pets ?? []).length === 0 ? (
              <div className="p-8 text-center text-text-secondary text-[13px]">
                Kayıtlı evcil hayvan yok.
              </div>
            ) : (
              <div className="divide-y divide-border-main">
                {(pets ?? []).map((pet) => (
                  <div key={pet.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-bg-main border border-border-main flex items-center justify-center text-lg flex-shrink-0">
                      {pet.species === 'cat' ? '🐱' : '🐶'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text-primary text-[14px]">{pet.name}</div>
                      <div className="text-[12px] text-text-secondary mt-0.5">
                        {pet.breed ?? pet.species ?? '—'} · {ageFromBirthDate(pet.birth_date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link
                        href={`/owner/pets/${pet.id}`}
                        className="text-[12px] text-primary font-semibold hover:underline px-2 py-1"
                      >
                        Görüntüle →
                      </Link>
                      <DeletePetButton petId={pet.id} petName={pet.name} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Stream */}
          <div className="card-base overflow-hidden">
            <div className="px-6 py-4 border-b border-border-main">
              <h2 className="font-black text-[15px] text-text-primary flex items-center gap-2">
                📡 Son Etkinlikler
                <span className="text-[12px] font-semibold text-text-secondary ml-1">(son 20)</span>
              </h2>
            </div>
            {(events ?? []).length === 0 ? (
              <div className="p-8 text-center text-text-secondary text-[13px]">
                Kayıtlı etkinlik akışı yok.
              </div>
            ) : (
              <div className="divide-y divide-border-main max-h-[480px] overflow-y-auto">
                {(events ?? []).map((ev: any) => {
                  const eventName = ev.event || ev.event_type || 'Etkinlik Kaydı'
                  const eventTime = ev.ts || ev.created_at
                  const ts = eventTime ? new Date(eventTime) : new Date()
                  const payload = (ev.payload && Object.keys(ev.payload).length > 0 ? ev.payload : ev.metadata) as Record<string, unknown> | null
                  return (
                    <div key={ev.id} className="px-6 py-3.5 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-[12px] font-mono text-text-primary font-semibold">
                            {eventName}
                          </code>
                          <span className="text-[11px] text-text-secondary flex-shrink-0">
                            {ts.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}{' '}
                            {ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {payload && Object.keys(payload).length > 0 && (
                          <div className="mt-1 text-[11px] text-text-secondary font-mono truncate">
                            {JSON.stringify(payload).slice(0, 80)}…
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Subscription Credits Ledger */}
          <SubscriptionCreditsLedger credits={creditHistory ?? []} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Subscription & Pro Credit */}
          <div className="card-base p-5 space-y-4">
            <h2 className="font-black text-[14px] text-text-primary flex items-center justify-between">
              <span className="flex items-center gap-2">⭐ Abonelik & Pro Kredisi</span>
              <Link href="/admin/memberships" className="text-2xs font-bold text-primary hover:underline">
                Kredi Yükle →
              </Link>
            </h2>

            <div className="space-y-3">
              <ProCountdownCard premiumUntil={profile.premium_until} />

              {subscription && (
                <div className="pt-2 border-t border-border-main space-y-1 text-[12px] text-text-secondary">
                  <div className="font-bold text-slate-800 mb-1">Stripe / Ödemeli Abonelik:</div>
                  <SubBadge plan={subscription.plan} status={subscription.status} />
                  {subscription.ends_at && (
                    <div className="mt-1 text-2xs">Bitiş: {new Date(subscription.ends_at).toLocaleDateString('tr-TR')}</div>
                  )}
                </div>
              )}

              <QuickGrantUserButton userId={profile.id} userName={fullName} />
            </div>
          </div>

          {/* Role Change */}
          <div className="card-base p-5">
            <h2 className="font-black text-[14px] text-text-primary mb-1 flex items-center gap-2">
              🔑 Rol Değiştir
            </h2>
            <p className="text-[12px] text-text-secondary mb-4">
              Mevcut rol: <RoleBadge role={profile.role} />
            </p>
            <RoleChangeForm
              userId={profile.id}
              currentRole={profile.role ?? 'owner'}
              actorRole={actor.role ?? 'admin'}
            />
          </div>

            {/* Quick stats */}
          <div className="card-base p-5 space-y-3">
            <h2 className="font-black text-[14px] text-text-primary mb-1">📊 Özet</h2>
            
            <div className="flex items-center justify-between text-[13px] pb-2 border-b border-border-main">
              <span className="text-text-secondary">Profil Tamamlanma</span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${completionColor}`}>
                %{completionPct}
              </span>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text-secondary">Toplam Pet</span>
              <span className="font-bold text-text-primary">{(pets ?? []).length}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text-secondary">Toplam Etkinlik</span>
              <span className="font-bold text-text-primary">{(events ?? []).length}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text-secondary">Plan</span>
              <span className="font-bold text-text-primary">{subscription?.plan?.toUpperCase() ?? 'FREE'}</span>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card-base p-5 border-rose-100 bg-rose-50/30">
            <h2 className="font-black text-[14px] text-rose-600 mb-2 flex items-center gap-2">
              ⚠️ Tehlikeli Bölge
            </h2>
            <p className="text-[12px] text-text-secondary mb-4 leading-relaxed">
              Bu hesabı sildiğinizde; kullanıcıya ait tüm evcil hayvanlar, etkinlik geçmişi ve abonelikler sistemden kalıcı olarak temizlenir. Bu işlem geri alınamaz.
            </p>
            <DeleteUserButton userId={profile.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
