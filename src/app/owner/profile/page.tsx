import { getCurrentProfile, getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { logout } from '@/features/auth/actions'
import PetCardActions from './PetCardActions'
import NotificationSettings from './NotificationSettings'
import CoachMark from '@/components/ui/CoachMark'
import { BiometricPrompt } from '@/components/BiometricPrompt'
import { BiometricSettingsRow } from '@/components/BiometricSettingsRow'
export default async function ProfileMenuPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const profile = await getCurrentProfile()
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()
  const params = await searchParams
  const showBiometricPrompt = params.biometric === 'true'
  
  const { data: pets } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', profile?.id ?? '')
    
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('profile_id', profile?.id ?? '')
    .single()

  const planName = subscription?.plan === 'pro' ? 'Odi Pro' : subscription?.plan === 'ai_plus' ? 'Odi AI+' : 'Odi Free'
  const isPremium = subscription?.plan === 'pro' || subscription?.plan === 'ai_plus'
  
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
  // Her check bir "slot" temsil eder; totalTasks = olası maksimum slot sayısı
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
  // %100 tamamlandıysa tam göster; aksi hâlde minimum %15 (kullanıcıyı cesaretlendirmek için)
  const progress = completedTasks === totalTasks ? 100 : Math.max(15, Math.round((completedTasks / totalTasks) * 100))

  return (
    <div className="flex flex-col gap-8 pb-20 w-full mx-auto font-sans">

      {/* Back Link */}
      <div className="flex items-center px-2 -mb-4">
        <Link href="/owner/dashboard" className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors text-[14px] font-bold group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Ana Sayfa'ya Dön
        </Link>
      </div>

      {/* 1. Header / Identity Layer */}
      <section className="card-base overflow-hidden relative shadow-lg shadow-primary/5">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary to-primary-hover"/>
        
        <div className="px-6 pt-12 pb-6 relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-primary text-[40px] font-black ring-[6px] ring-white shadow-xl mb-4 relative">
            {profile?.first_name?.charAt(0) ?? 'U'}
            <div className={`absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${isPremium ? 'bg-amber-400 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {isPremium ? 'PRO' : 'FREE'}
            </div>
          </div>
          
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">
            {profile?.first_name} {profile?.last_name ?? ''}
          </h1>
          <p className="text-text-secondary text-[15px] font-medium">{user?.email}</p>
          
          <div className="flex items-center gap-2 mt-4 bg-bg-main px-4 py-2 rounded-full border border-border-main">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
            <span className="text-[12px] font-bold text-text-secondary uppercase tracking-widest">{planName} Üyesi</span>
            {isPremium && subscription?.current_period_end && (
              <span className="text-[11px] text-text-secondary ml-1">• Yenilenme: {new Date(subscription.current_period_end).toLocaleDateString('tr-TR')}</span>
            )}
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
              <div className="flex justify-between text-[12px] font-bold mb-2">
                <span className="text-text-secondary">%{progress} Profil Tamamlandı</span>
                {tasks.length > 0 && <span className="text-primary cursor-pointer hover:underline">Tamamla</span>}
              </div>
              <div className="h-2.5 w-full bg-bg-main rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
              {tasks.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 hide-scrollbar">
                  {tasks.map((task, i) => (
                    <Link key={i} href={task.link} className="px-3 py-1.5 rounded-lg bg-bg-main text-[11px] font-semibold text-text-secondary border border-border-main shrink-0 cursor-pointer hover:bg-border-main hover:text-text-primary transition-colors">
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
      <section className="flex flex-col gap-3">
        <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">Abonelik Yönetimi</h2>
        <div className="card-base p-6 border-l-4 border-l-amber-400">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[20px] font-extrabold text-text-primary flex items-center gap-2">
                {planName}
                {isPremium && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                )}
              </h3>
              <p className="text-[14px] text-text-secondary mt-1">{isPremium ? 'Tüm Pro avantajları aktif' : 'Ücretsiz plana devam ediyorsunuz'}</p>
            </div>
            {isPremium ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-bold rounded-full">Otomatik Yenileme Açık</span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full">Ücretsiz Sürüm</span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
              <div className="w-5 h-5 rounded-full bg-primary-soft text-primary flex items-center justify-center">✓</div> Vet Chat
            </div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
              <div className="w-5 h-5 rounded-full bg-primary-soft text-primary flex items-center justify-center">✓</div> Predictive Analytics
            </div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
              <div className="w-5 h-5 rounded-full bg-primary-soft text-primary flex items-center justify-center">✓</div> Premium İçerik
            </div>
            <div className="flex items-center gap-2 text-[13px] font-medium text-text-secondary opacity-50">
              <div className="w-5 h-5 rounded-full bg-bg-main text-text-secondary flex items-center justify-center border border-border-main">✗</div> Nutrition Insights
            </div>
          </div>
          
      <div className="flex flex-wrap gap-3">
            <Link href="/owner/profile/subscription" className={`btn-${isPremium ? 'secondary' : 'primary'} text-[13px] py-2 px-5`}>
              {isPremium ? 'Aboneliği Yönet →' : 'Pro\'ya Yükselt →'}
            </Link>
            <Link href="/owner/profile/subscription" className="btn-secondary text-[13px] py-2 px-5">Fatura Geçmişi</Link>
            {isPremium && <button className="text-error text-[13px] font-bold ml-auto hover:underline">Aboneliği İptal Et</button>}
          </div>
        </div>
      </section>

      {/* 3. Pet Ecosystem Management */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Can Dostlarım</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {pets?.map(pet => (
            <div key={pet.id} className="card-base p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-soft to-primary/20 flex items-center justify-center text-primary font-black text-[20px] shrink-0">
                {pet.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-[16px] font-bold text-text-primary">{pet.name}</h3>
                <p className="text-[13px] text-text-secondary font-medium">{pet.species} • {pet.breed || 'Bilinmiyor'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">

                <PetCardActions pet={pet} />
              </div>
            </div>
          ))}
          {(!pets || pets.length === 0) && (
            <div className="card-base p-6 text-center text-text-secondary text-[14px]">
              Henüz kayıtlı bir can dostunuz yok.
            </div>
          )}
        </div>
      </section>



      {/* 4. Notification Intelligence Center */}
      <NotificationSettings />

      {/* 6. Billing History */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">Ödeme Geçmişi</h2>
        <div className="card-base overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-bg-main text-text-secondary font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-4 py-3">Tarih</th>
                <th className="p-4 py-3">Tutar</th>
                <th className="p-4 py-3">Durum</th>
                <th className="p-4 py-3 text-right">Belge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main font-medium">
              <tr>
                <td className="p-4 text-text-primary">01 May 2026</td>
                <td className="p-4 text-text-primary">₺149.00</td>
                <td className="p-4"><span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[11px] font-bold">Ödendi</span></td>
                <td className="p-4 text-right"><span className="text-primary cursor-pointer hover:underline">PDF</span></td>
              </tr>
              <tr>
                <td className="p-4 text-text-primary">01 Nis 2026</td>
                <td className="p-4 text-text-primary">₺149.00</td>
                <td className="p-4"><span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[11px] font-bold">Ödendi</span></td>
                <td className="p-4 text-right"><span className="text-primary cursor-pointer hover:underline">PDF</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* App Settings */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">Uygulama Ayarları</h2>
        <div className="card-base divide-y divide-border-main text-[14px] font-semibold text-text-primary">

          <Link href="/owner/profile/task-settings" className="block p-4 hover:bg-bg-main transition-colors flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              Görev & Hatırlatıcı Ayarları
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
          <Link href="/owner/profile/feeding-templates" className="block p-4 hover:bg-bg-main transition-colors flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              Beslenme & Porsiyon Şablonları
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
          <Link href="/owner/profile/appearance" className="block p-4 hover:bg-bg-main transition-colors flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2.7l3 9h9l-7.3 5.4 2.8 8.9L12 20.6l-7.5 5.4 2.8-8.9L0 11.7h9z"/>
                </svg>
              </div>
              Tema & Görüntüleme Seçenekleri
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
          <Link href="/owner/profile/unit-preferences" className="block p-4 hover:bg-bg-main transition-colors flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              Birim & Ölçü Tercihleri
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>
      </section>

      {/* 5. Data & Privacy Hub & 8. Support Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="flex flex-col gap-3">
          <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">Veri & Güvenlik</h2>
          <div className="card-base divide-y divide-border-main text-[14px] font-semibold text-text-primary">
            <Link href="/owner/profile/edit" className="block p-4 hover:bg-bg-main transition-colors flex justify-between items-center">
              Profil Bilgilerini Düzenle
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
            <BiometricSettingsRow initialHasPasskey={(passkeyCount ?? 0) > 0} />
            <div className="p-4 hover:bg-bg-main transition-colors cursor-pointer flex justify-between items-center">
              Şifre Değiştir
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div className="p-4 hover:bg-bg-main transition-colors cursor-pointer flex justify-between items-center">
              Tüm Verilerimi İndir
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3"/></svg>
            </div>
            <div className="p-4 hover:bg-error/5 transition-colors cursor-pointer text-error flex justify-between items-center">
              Hesabı Sil
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">Destek Merkezi</h2>
          <div className="card-base divide-y divide-border-main text-[14px] font-semibold text-text-primary">
            <div className="p-4 hover:bg-bg-main transition-colors cursor-pointer flex justify-between items-center">
              Yardım Merkezi (SSS)
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div className="p-4 hover:bg-bg-main transition-colors cursor-pointer flex justify-between items-center">
              Canlı Destek
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            </div>
            <div className="p-4 hover:bg-bg-main transition-colors cursor-pointer flex justify-between items-center">
              Yeni Özellik İste
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div className="p-4 bg-bg-main/50 flex justify-between items-center">
              Sistem Durumu
              <span className="text-[12px] font-bold text-green-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/> Operasyonel</span>
            </div>
          </div>
        </section>
      </div>



      {/* Logout & 9. Legal */}
      <div className="flex flex-col items-center gap-6 mt-4">
        <form action={logout} className="w-full">
          <button type="submit" className="w-full card-base p-4 text-center font-bold text-error hover:bg-error/5 transition-colors border-error/20">
            Hesaptan Çıkış Yap
          </button>
        </form>
        
        <div className="flex items-center gap-4 text-[11px] font-bold text-text-secondary uppercase tracking-widest">
          <Link href="/legal/terms" className="hover:text-primary transition-colors">Kullanım Koşulları</Link>
          <span>•</span>
          <Link href="/legal/kvkk" className="hover:text-primary transition-colors">Gizlilik (KVKK)</Link>
          <span>•</span>
          <Link href="/legal/kvkk" className="hover:text-primary transition-colors">Lisanslar</Link>
        </div>
      </div>

      <BiometricPrompt forceOpen={showBiometricPrompt} />
    </div>
  )
}
