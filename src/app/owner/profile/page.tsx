import { getCurrentProfile, getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getEntitlement } from '@/lib/subscription/entitlement'
import Link from 'next/link'
import { logout } from '@/features/auth/actions'
import PetCardActions from './PetCardActions'
import NotificationSettings from './NotificationSettings'
import CoachMark from '@/components/ui/CoachMark'
import { BiometricPrompt } from '@/components/BiometricPrompt'
import { BiometricSettingsRow } from '@/components/BiometricSettingsRow'
import {
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  Calendar,
  Syringe,
  Activity,
  Package,
  Palette,
  Settings,
  ShieldCheck,
  KeyRound,
  Lock,
  Download,
  Trash2,
  HelpCircle,
  Headphones,
  LogOut,
  FileText,
  Utensils,
  Plus,
  Sparkles,
  CreditCard,
  Crown,
  Gift,
  Users,
  MapPin,
  ShieldAlert,
  Stethoscope,
  Phone,
  User,
} from 'lucide-react'

export default async function ProfileMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const profile = await getCurrentProfile()
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()
  const params = await searchParams
  const showBiometricPrompt = params.biometric === 'true'

  const [
    { data: pets },
    { data: userCredits },
    { data: userReferrals },
  ] = await Promise.all([
    supabase
      .from('pets')
      .select('*')
      .eq('owner_id', profile?.id ?? ''),
    supabase
      .from('membership_credits')
      .select('credit_days, reason, created_at')
      .eq('profile_id', profile?.id ?? '')
      .order('created_at', { ascending: false }),
    supabase
      .from('referrals')
      .select('id, status, created_at')
      .eq('referrer_id', profile?.id ?? ''),
  ])

  const totalCreditDays = (userCredits || []).reduce((acc, c) => acc + (c.credit_days || 0), 0)
  const totalReferredUsers = userReferrals?.length ?? 0
  const qualifiedReferrals = userReferrals?.filter(r => r.status === 'qualified').length ?? 0

  const entitlement = await getEntitlement(profile?.id ?? '')

  const planName =
    entitlement.tier === 'pro'
      ? 'Odi Pro'
      : entitlement.tier === 'ai_plus'
      ? 'Odi AI+'
      : 'Odi Free'
  const isPremium = entitlement.isPremium

  let hasVaccineRecords = false
  if (pets && pets.length > 0) {
    const { count } = await supabase
      .from('vaccine_records_v2')
      .select('*', { count: 'exact', head: true })
      .in('pet_id', pets.map(p => p.id))
    hasVaccineRecords = (count ?? 0) > 0
  }

  // Fetch Passkeys Count for Biometric Task Completion
  const { count: passkeyCount } = await supabase
    .from('passkeys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id ?? '')

  // Calculate Profile Completion Tasks
  const completionChecks = [
    { done: !!(user?.phone || (profile as any)?.phone), label: 'Telefon Ekle', action: '+ Telefon Ekle', link: '/owner/profile/edit' },
    { done: !!((profile as any)?.emergency_contact_name), label: 'Acil İletişim Kişisi Ekle', action: '+ Acil Kişi', link: '/owner/profile/edit' },
    { done: !!((profile as any)?.city), label: 'Konum Bilgisi Ekle', action: '+ Konum Ekle', link: '/owner/profile/edit' },
    { done: (passkeyCount ?? 0) > 0, label: 'Biyometrik Giriş Tanımla', action: '+ Şifresiz Giriş', link: '/owner/profile?biometric=true' },
    { done: isPremium, label: 'Ödeme Yöntemi Ekle', action: '+ Ödeme Yöntemi Ekle', link: '/owner/profile/subscription' },
    { done: !!(pets && pets.length > 0), label: 'İlk Can Dostunu Ekle', action: '+ Can Dost Ekle', link: '/owner/pets/add' },
    { done: hasVaccineRecords, label: 'Aşı Kaydı Gir', action: '+ Aşı Ekle', link: pets && pets.length > 0 ? `/owner/pets/${pets[0].id}` : '/owner/pets/add' },
  ]

  const tasks = completionChecks.filter(c => !c.done)
  const totalTasks = completionChecks.length
  const completedTasks = completionChecks.filter(c => c.done).length
  const progress = completedTasks === totalTasks ? 100 : Math.max(15, Math.round((completedTasks / totalTasks) * 100))

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto font-sans">
      {/* Back Link */}
      <div className="flex items-center px-1 -mb-2">
        <Link
          href="/owner/dashboard"
          className="flex items-center gap-2 text-text-secondary hover:text-primary transition-all text-sm font-semibold group active:scale-[0.98]"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Ana Sayfa'ya Dön
        </Link>
      </div>

      {/* 1. Header / Identity Layer */}
      <section className="bg-white rounded-3xl overflow-hidden relative border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary to-primary-hover" />

        <div className="px-6 pt-12 pb-6 relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-primary text-3xl font-black ring-4 ring-white shadow-lg mb-3 relative">
            {profile?.first_name?.charAt(0) ?? 'U'}
            <div
              className={`absolute bottom-0 right-0 px-2 h-7 rounded-full border-2 border-white flex items-center justify-center text-2xs font-bold ${
                isPremium ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isPremium ? (entitlement.source === 'credit' ? `PRO · ${entitlement.daysLeft} gün` : 'PRO') : 'FREE'}
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            {profile?.first_name} {profile?.last_name ?? ''}
          </h1>
          <p className="text-text-secondary text-sm font-medium mt-0.5">{user?.email}</p>

          <div className="flex items-center gap-2 mt-3 bg-bg-main px-4 py-1.5 rounded-full border border-border-main">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {entitlement.source === 'credit' ? `Odi Pro · ${entitlement.daysLeft} gün kaldı` : `${planName} Üyesi`}
            </span>
          </div>

          {/* Profile Completion Bar */}
          {progress < 100 && (
            <div className="w-full max-w-sm mt-6 relative">
              <CoachMark
                hintKey="profile_completion"
                title="Profilini tamamla"
                message="Daha fazla özellik açmak ve kişiselleştirilmiş deneyim için profil adımlarını bitir."
                icon="🚀"
                position="top"
              />
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-text-secondary">%{progress} Profil Tamamlandı</span>
                {tasks.length > 0 && <span className="text-primary hover:underline">Tamamla</span>}
              </div>
              <div className="h-2.5 w-full bg-bg-main rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {tasks.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 hide-scrollbar">
                  {tasks.map((task, i) => (
                    <Link
                      key={i}
                      href={task.link}
                      className="px-3 py-1.5 rounded-xl bg-bg-main text-xs font-semibold text-text-secondary border border-border-main shrink-0 cursor-pointer hover:bg-border-main hover:text-text-primary transition-all active:scale-[0.98]"
                    >
                      {task.action}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Enriched Owner Details & Emergency Contact Card */}
      <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-primary" />
            Ebeveyn Profil Detayları
          </h2>
          <Link
            href="/owner/profile/edit"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            Düzenle
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Item 1: Location */}
          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-2xs font-bold text-teal-800 uppercase tracking-wider">Konum</div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                {(profile as any)?.city
                  ? `${(profile as any).city}${(profile as any)?.district ? `, ${(profile as any).district}` : ''}${(profile as any)?.neighborhood ? ` (${(profile as any).neighborhood})` : ''}`
                  : 'Belirtilmedi'}
              </div>
            </div>
          </div>

          {/* Item 2: Emergency Contact */}
          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <div className="text-2xs font-bold text-rose-800 uppercase tracking-wider">Acil Durum Kişileri</div>
              <div>
                <div className="text-sm font-extrabold text-slate-800">
                  {(profile as any)?.emergency_contact_name || 'Tanımlanmadı'}
                </div>
                {(profile as any)?.emergency_contact_phone && (
                  <div className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0" />
                    {(profile as any).emergency_contact_phone}
                    {(profile as any)?.emergency_contact_relation && ` (${(profile as any).emergency_contact_relation})`}
                  </div>
                )}
              </div>
              {(profile as any)?.emergency_contact2_name && (
                <div className="pt-1.5 border-t border-rose-200/50">
                  <div className="text-xs font-bold text-slate-800">
                    2. {(profile as any).emergency_contact2_name}
                  </div>
                  {(profile as any)?.emergency_contact2_phone && (
                    <div className="text-2xs font-semibold text-rose-700 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 shrink-0" />
                      {(profile as any).emergency_contact2_phone}
                      {(profile as any)?.emergency_contact2_relation && ` (${(profile as any).emergency_contact2_relation})`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Item 3: Preferred Vet */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <div className="text-2xs font-bold text-indigo-800 uppercase tracking-wider">Kayıtlı Veteriner</div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                {(profile as any)?.preferred_vet_name || 'Tanımlanmadı'}
              </div>
              {(profile as any)?.preferred_vet_phone && (
                <div className="text-xs font-semibold text-indigo-700 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {(profile as any).preferred_vet_phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {(profile as any)?.bio && (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600">
            <span className="font-bold text-slate-700">Hakkımda: </span>
            {(profile as any).bio}
          </div>
        )}
      </section>

      {/* 2. Subscription Command Center */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-2">Abonelik & Kredi Durum Merkezi</h2>
        <div className="bg-white rounded-3xl p-6 border-l-4 border-l-amber-400 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] space-y-5">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
                {planName}
                {isPremium && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
              </h3>
              <p className="text-sm font-semibold text-text-secondary mt-1">
                {isPremium ? (
                  entitlement.daysLeft >= 3650 ? (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      👑 Ömür Boyu Sonsuz Pro Kullanım (Süresiz ♾️)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      👑 Aktif Pro Kullanıcı ({entitlement.daysLeft} Gün Kaldı
                      {entitlement.validUntil && ` · Bitiş: ${new Date(entitlement.validUntil).toLocaleDateString('tr-TR')}`})
                    </span>
                  )
                ) : (
                  'Ücretsiz (Free) plana devam ediyorsunuz'
                )}
              </p>
            </div>
            {isPremium ? (
              <span className="px-3.5 py-1 bg-amber-50 text-amber-800 text-xs font-black rounded-full border border-amber-200/80 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                {entitlement.daysLeft >= 3650 ? 'Sonsuz ♾️ Pro' : `${entitlement.daysLeft} Gün Aktif`}
              </span>
            ) : (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                Ücretsiz Sürüm
              </span>
            )}
          </div>

          {/* 3 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Stat 1: Status / Days Left */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
              <div className="text-2xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                Abonelik Durumu
              </div>
              <div className="text-base font-black text-amber-950">
                {isPremium ? (entitlement.daysLeft >= 3650 ? 'Sonsuz ♾️' : `${entitlement.daysLeft} Gün Kaldı`) : 'Free (Ücretsiz)'}
              </div>
              <div className="text-2xs font-semibold text-amber-700">
                {isPremium ? (entitlement.daysLeft >= 3650 ? 'Sınırsız Ömür Boyu Erişim' : `Son Gün: ${new Date(entitlement.validUntil!).toLocaleDateString('tr-TR')}`) : 'Pro avantajlar pasif'}
              </div>
            </div>

            {/* Stat 2: Total Credits Earned */}
            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/70 space-y-1">
              <div className="text-2xs font-extrabold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-purple-600" />
                Kazanılan Krediler
              </div>
              <div className="text-base font-black text-purple-950">
                +{totalCreditDays >= 36500 ? 'Sonsuz ♾️' : `${totalCreditDays} Gün`}
              </div>
              <div className="text-2xs font-semibold text-purple-700">
                {userCredits?.length ?? 0} İşlem / Promosyon Hediye
              </div>
            </div>

            {/* Stat 3: Referred Users */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-1">
              <div className="text-2xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Davet Edilen Üyeler
              </div>
              <div className="text-base font-black text-emerald-950">
                {totalReferredUsers} Kişi
              </div>
              <div className="text-2xs font-semibold text-emerald-700">
                {qualifiedReferrals > 0 ? `${qualifiedReferrals} Nitelikli Kayıt Bonusu` : 'Arkadaşlarını davet et Pro kazan'}
              </div>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              Vet Chat & AI Asistan
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              Tahminsel Analitik & Risk Uyarısı
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              Premium Rehber & Sağlık İçeriği
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              Gelişmiş Beslenme & Sağlık Raporları
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center pt-2">
            <Link
              href="/owner/profile/subscription"
              className={`rounded-2xl text-sm font-semibold py-2.5 px-5 transition-all active:scale-[0.98] ${
                isPremium ? 'btn-secondary' : 'btn-primary'
              }`}
            >
              {isPremium ? 'Aboneliği Yönet →' : 'Pro\'ya Yükselt →'}
            </Link>
            <Link
              href="/referral"
              className="btn-secondary text-sm font-semibold py-2.5 px-5 rounded-2xl active:scale-[0.98] flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Arkadaşlarını Davet Et (+30 Gün)</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Pet Ecosystem Management */}
      <section className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Can Dostlarım</h2>
          <Link
            href="/owner/pets/add"
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Dost Ekle
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {pets?.map(pet => (
            <div
              key={pet.id}
              className="bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:border-primary/30 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-black text-xl shrink-0">
                {pet.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">{pet.name}</h3>
                <p className="text-sm text-text-secondary font-medium">
                  {pet.species} • {pet.breed || 'Bilinmiyor'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <PetCardActions pet={pet} />
              </div>
            </div>
          ))}
          {(!pets || pets.length === 0) && (
            <div className="bg-white rounded-3xl p-6 text-center text-text-secondary text-sm font-medium border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
              Henüz kayıtlı bir can dostunuz yok.
            </div>
          )}
        </div>
      </section>

      {/* 4. Notification Intelligence Center */}
      <NotificationSettings />



      {/* 6. App Settings */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-2">Uygulama Ayarları</h2>
        <div className="bg-white rounded-3xl divide-y divide-border-main text-sm font-semibold text-text-primary border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden">
          <Link
            href="/owner/profile/task-settings"
            className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              Görev & Hatırlatıcı Ayarları
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>

          <Link
            href="/owner/profile/vaccine-settings"
            className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Syringe className="w-5 h-5" />
              </div>
              Aşı & Parazit Şablonları
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>

          <Link
            href="/owner/profile/symptom-settings"
            className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              Semptom Şablonları
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>

          <Link
            href="/owner/profile/product-settings"
            className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              Ürün Şablonları
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>

          <Link
            href="/owner/profile/feeding-templates"
            className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              Beslenme & Porsiyon Şablonları
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>

          <Link
            href="/owner/profile/appearance"
            className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              Tema & Görüntüleme Seçenekleri
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>

          <Link
            href="/owner/profile/unit-preferences"
            className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              Birim & Ölçü Tercihleri
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>
        </div>
      </section>

      {/* 7. Data & Privacy Hub & Support Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-2">Veri & Güvenlik</h2>
          <div className="bg-white rounded-3xl divide-y divide-border-main text-sm font-semibold text-text-primary border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden">
            <Link
              href="/owner/profile/edit"
              className="p-4 hover:bg-bg-main transition-all flex justify-between items-center active:scale-[0.99]"
            >
              Profil Bilgilerini Düzenle
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </Link>
            <BiometricSettingsRow initialHasPasskey={(passkeyCount ?? 0) > 0} />
            <div className="p-4 hover:bg-bg-main transition-all cursor-pointer flex justify-between items-center active:scale-[0.99]">
              Şifre Değiştir
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="p-4 hover:bg-bg-main transition-all cursor-pointer flex justify-between items-center active:scale-[0.99]">
              Tüm Verilerimi İndir
              <Download className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="p-4 hover:bg-rose-50/50 transition-all cursor-pointer text-error flex justify-between items-center active:scale-[0.99]">
              Hesabı Sil
              <Trash2 className="w-4 h-4 text-error" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-2">Destek Merkezi</h2>
          <div className="bg-white rounded-3xl divide-y divide-border-main text-sm font-semibold text-text-primary border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="p-4 hover:bg-bg-main transition-all cursor-pointer flex justify-between items-center active:scale-[0.99]">
              Yardım Merkezi (SSS)
              <HelpCircle className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="p-4 hover:bg-bg-main transition-all cursor-pointer flex justify-between items-center active:scale-[0.99]">
              Canlı Destek
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="p-4 hover:bg-bg-main transition-all cursor-pointer flex justify-between items-center active:scale-[0.99]">
              Yeni Özellik İste
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="p-4 bg-bg-main/50 flex justify-between items-center">
              Sistem Durumu
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operasyonel
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Logout & Legal */}
      <div className="flex flex-col items-center gap-5 mt-2">
        <form action={logout} className="w-full">
          <button
            type="submit"
            className="w-full bg-white rounded-3xl p-4 text-center text-sm font-bold text-error hover:bg-rose-50/50 transition-all border border-rose-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 text-error" />
            Hesaptan Çıkış Yap
          </button>
        </form>

        <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary tracking-wider">
          <Link href="/legal/terms" className="hover:text-primary transition-colors">
            Kullanım Koşulları
          </Link>
          <span>•</span>
          <Link href="/legal/kvkk" className="hover:text-primary transition-colors">
            Gizlilik (KVKK)
          </Link>
          <span>•</span>
          <Link href="/legal/kvkk" className="hover:text-primary transition-colors">
            Lisanslar
          </Link>
        </div>
      </div>

      <BiometricPrompt forceOpen={showBiometricPrompt} />
    </div>
  )
}
