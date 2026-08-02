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

  const { data: pets } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', profile?.id ?? '')

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

      {/* 2. Subscription Command Center */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-2">Abonelik Yönetimi</h2>
        <div className="bg-white rounded-3xl p-6 border-l-4 border-l-amber-400 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
                {planName}
                {isPremium && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {isPremium ? 'Tüm Pro avantajları aktif' : 'Ücretsiz plana devam ediyorsunuz'}
              </p>
            </div>
            {isPremium ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                Otomatik Yenileme Açık
              </span>
            ) : (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                Ücretsiz Sürüm
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
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
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary opacity-60">
              <div className="w-5 h-5 rounded-full bg-bg-main text-text-secondary flex items-center justify-center border border-border-main">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              </div>
              Gelişmiş Beslenme Raporları
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Link
              href="/owner/profile/subscription"
              className={`rounded-2xl text-sm font-semibold py-2.5 px-5 transition-all active:scale-[0.98] ${
                isPremium ? 'btn-secondary' : 'btn-primary'
              }`}
            >
              {isPremium ? 'Aboneliği Yönet →' : 'Pro\'ya Yükselt →'}
            </Link>
            <Link
              href="/owner/profile/subscription"
              className="btn-secondary text-sm font-semibold py-2.5 px-5 rounded-2xl active:scale-[0.98]"
            >
              Fatura Geçmişi
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

      {/* 5. Billing History */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-2">Ödeme Geçmişi</h2>
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-main text-text-secondary font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 py-3">Tarih</th>
                <th className="p-4 py-3">Tutar</th>
                <th className="p-4 py-3">Durum</th>
                <th className="p-4 py-3 text-right">Belge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main font-medium">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-text-primary">01 May 2026</td>
                <td className="p-4 text-text-primary">₺149.00</td>
                <td className="p-4">
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-bold">Ödendi</span>
                </td>
                <td className="p-4 text-right">
                  <span className="text-primary font-semibold cursor-pointer hover:underline">PDF</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-text-primary">01 Nis 2026</td>
                <td className="p-4 text-text-primary">₺149.00</td>
                <td className="p-4">
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-bold">Ödendi</span>
                </td>
                <td className="p-4 text-right">
                  <span className="text-primary font-semibold cursor-pointer hover:underline">PDF</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

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
