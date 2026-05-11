import { getCurrentProfile, getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { logout } from '@/features/auth/actions'
import PetCardActions from './PetCardActions'

export default async function ProfileMenuPage() {
  const profile = await getCurrentProfile()
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()
  
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
  


  return (
    <div className="flex flex-col gap-8 pb-20 w-full mx-auto font-sans">

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
          <div className="w-full max-w-sm mt-6">
            <div className="flex justify-between text-[12px] font-bold mb-2">
              <span className="text-text-secondary">%78 Profil Tamamlandı</span>
              <span className="text-primary cursor-pointer hover:underline">Tamamla</span>
            </div>
            <div className="h-2.5 w-full bg-bg-main rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '78%' }} />
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 hide-scrollbar">
              <span className="px-3 py-1.5 rounded-lg bg-bg-main text-[11px] font-semibold text-text-secondary border border-border-main shrink-0 cursor-pointer hover:bg-border-main transition-colors">+ Telefon Ekle</span>
              <span className="px-3 py-1.5 rounded-lg bg-bg-main text-[11px] font-semibold text-text-secondary border border-border-main shrink-0 cursor-pointer hover:bg-border-main transition-colors">+ Ödeme Yöntemi Ekle</span>
            </div>
          </div>
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
              <p className="text-[14px] text-text-secondary mt-1">Aktif Avantajlar (3/4 Kullanımda)</p>
            </div>
            {isPremium ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-bold rounded-full">Otomatik Yenileme Açık</span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full">Ücretsiz Sürüm</span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
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
          <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Pati Dostlarım</h2>
          <Link href="/owner/pets/new" className="text-primary text-[12px] font-bold hover:underline flex items-center gap-1">
            + Yeni Ekle
          </Link>
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
              Henüz kayıtlı bir pati dostunuz yok.
            </div>
          )}
        </div>
      </section>



      {/* 4. Notification Intelligence Center */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">Akıllı Bildirimler</h2>
        <div className="card-base divide-y divide-border-main">
          {[
            { id: 'vaccine', label: 'Aşı ve Parazit Hatırlatmaları', desc: 'Gecikmeden hemen önce haber ver', active: true },
            { id: 'nutrition', label: 'Beslenme Uyarıları', desc: 'Mama stoğu azaldığında uyar', active: true },
            { id: 'payment', label: 'Ödeme ve Abonelik', desc: 'Fatura ve yenileme dönemi', active: false },
          ].map(setting => (
            <div key={setting.id} className="p-5 flex justify-between items-center group hover:bg-bg-main/30 transition-colors">
              <div>
                <p className="text-[15px] font-bold text-text-primary">{setting.label}</p>
                <p className="text-[13px] text-text-secondary">{setting.desc}</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${setting.active ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${setting.active ? 'translate-x-6' : 'translate-x-0'}`}/>
              </div>
            </div>
          ))}
          <div className="p-4 bg-bg-main/50 flex justify-between items-center text-[13px] font-semibold">
            <span className="text-text-secondary">Bildirim Sıklığı: <span className="text-primary cursor-pointer">Anlık (Instant)</span></span>
            <span className="text-text-secondary">Kanal: <span className="text-primary cursor-pointer">Push & Email</span></span>
          </div>
        </div>
      </section>

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
          <Link href="/owner/profile/custom-vaccines" className="block p-4 hover:bg-bg-main transition-colors flex justify-between items-center">
            Aşı & Parazit Şablonları
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
          <Link href="#" className="hover:text-primary transition-colors">Kullanım Koşulları</Link>
          <span>•</span>
          <Link href="#" className="hover:text-primary transition-colors">Gizlilik (KVKK)</Link>
          <span>•</span>
          <Link href="#" className="hover:text-primary transition-colors">Lisanslar</Link>
        </div>
      </div>

    </div>
  )
}
