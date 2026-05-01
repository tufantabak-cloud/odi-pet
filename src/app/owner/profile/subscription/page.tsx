import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

const PLAN_FEATURES = {
  free: {
    name: 'Odi Free',
    price: '₺0',
    color: 'gray',
    badge: 'bg-gray-100 text-gray-600',
    features: [
      { label: 'Temel Pet Profili', included: true },
      { label: 'Aşı Takvimi', included: true },
      { label: 'Sağlık Kayıtları', included: true },
      { label: 'AI Vet Chat', included: false },
      { label: 'Predictive Risk Analytics', included: false },
      { label: 'Nutrition Insights', included: false },
      { label: 'Sınırsız Pet Ekle', included: false },
      { label: 'Family Sharing', included: false },
      { label: 'PDF Rapor İndirme', included: false },
    ],
  },
  pro: {
    name: 'Odi Pro',
    price: '₺149',
    color: 'primary',
    badge: 'bg-primary/10 text-primary',
    features: [
      { label: 'Temel Pet Profili', included: true },
      { label: 'Aşı Takvimi', included: true },
      { label: 'Sağlık Kayıtları', included: true },
      { label: 'AI Vet Chat', included: true },
      { label: 'Predictive Risk Analytics', included: true },
      { label: 'Nutrition Insights', included: true },
      { label: 'Sınırsız Pet Ekle', included: true },
      { label: 'Family Sharing', included: false },
      { label: 'PDF Rapor İndirme', included: false },
    ],
  },
  ai_plus: {
    name: 'Odi AI+',
    price: '₺249',
    color: 'amber',
    badge: 'bg-amber-100 text-amber-600',
    features: [
      { label: 'Temel Pet Profili', included: true },
      { label: 'Aşı Takvimi', included: true },
      { label: 'Sağlık Kayıtları', included: true },
      { label: 'AI Vet Chat', included: true },
      { label: 'Predictive Risk Analytics', included: true },
      { label: 'Nutrition Insights', included: true },
      { label: 'Sınırsız Pet Ekle', included: true },
      { label: 'Family Sharing', included: true },
      { label: 'PDF Rapor İndirme', included: true },
    ],
  },
}

const MOCK_INVOICES = [
  { id: 'INV-2026-005', date: '01 May 2026', amount: '₺149.00', plan: 'Odi Pro', status: 'paid' },
  { id: 'INV-2026-004', date: '01 Nis 2026', amount: '₺149.00', plan: 'Odi Pro', status: 'paid' },
  { id: 'INV-2026-003', date: '01 Mar 2026', amount: '₺149.00', plan: 'Odi Pro', status: 'paid' },
  { id: 'INV-2026-002', date: '01 Şub 2026', amount: '₺149.00', plan: 'Odi Pro', status: 'paid' },
]

export default async function SubscriptionPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('profile_id', profile?.id ?? '')
    .single()

  const currentPlan = (subscription?.plan as 'free' | 'pro' | 'ai_plus') ?? 'free'
  const planInfo = PLAN_FEATURES[currentPlan]
  const isPaid = currentPlan !== 'free'
  const renewDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="flex flex-col gap-8 pb-20 w-full max-w-2xl mx-auto">

      {/* Back nav */}
      <Link href="/owner/profile" className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors text-[14px] font-semibold group -mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Profilime Dön
      </Link>

      <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Abonelik & Fatura</h1>

      {/* ─── Active Plan Card ─── */}
      <section className="card-base overflow-hidden">
        <div className={`h-1.5 w-full ${currentPlan === 'ai_plus' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : currentPlan === 'pro' ? 'bg-gradient-to-r from-primary to-primary-hover' : 'bg-gray-200'}`} />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${planInfo.badge}`}>
                  {planInfo.name}
                </span>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${subscription?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {subscription?.status === 'active' ? '● Aktif' : '● Pasif'}
                </span>
              </div>
              <p className="text-[36px] font-black text-text-primary">
                {planInfo.price}
                {isPaid && <span className="text-[16px] font-medium text-text-secondary ml-1">/ay</span>}
              </p>
              {renewDate && (
                <p className="text-[13px] text-text-secondary mt-1 font-medium">
                  Sonraki yenileme: <strong className="text-text-primary">{renewDate}</strong>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {currentPlan === 'free' && (
                <button className="btn-primary text-[14px] py-3 px-6 whitespace-nowrap">
                  Pro'ya Yükselt →
                </button>
              )}
              {currentPlan === 'pro' && (
                <>
                  <button className="btn-primary text-[14px] py-3 px-6 whitespace-nowrap bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600">
                    AI+'ya Yükselt →
                  </button>
                  <button className="btn-secondary text-[13px] py-2 px-6">Planı Değiştir</button>
                </>
              )}
              {currentPlan === 'ai_plus' && (
                <button className="btn-secondary text-[13px] py-2 px-6">Planı Yönet</button>
              )}
            </div>
          </div>

          {/* Auto-renew toggle row */}
          {isPaid && (
            <div className="mt-6 flex items-center justify-between p-4 bg-bg-main rounded-xl border border-border-main">
              <div>
                <p className="text-[14px] font-bold text-text-primary">Otomatik Yenileme</p>
                <p className="text-[12px] text-text-secondary">Aboneliğin {renewDate} tarihinde otomatik yenilenir</p>
              </div>
              <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full translate-x-6"/>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Feature Comparison ─── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Plan Karşılaştırması</h2>
        <div className="card-base overflow-hidden">
          <div className="grid grid-cols-4 bg-bg-main px-5 py-3 border-b border-border-main text-[12px] font-black text-text-secondary uppercase tracking-wider">
            <div className="col-span-1">Özellik</div>
            <div className="text-center">Free</div>
            <div className="text-center text-primary">Pro</div>
            <div className="text-center text-amber-500">AI+</div>
          </div>
          {PLAN_FEATURES.free.features.map((feat, i) => (
            <div key={feat.label} className={`grid grid-cols-4 px-5 py-3.5 items-center text-[13px] ${i % 2 === 0 ? '' : 'bg-bg-main/30'} ${currentPlan !== 'free' && !feat.included ? 'opacity-40' : ''}`}>
              <div className="col-span-1 font-semibold text-text-primary">{feat.label}</div>
              <div className="text-center">{PLAN_FEATURES.free.features[i].included ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-300">—</span>}</div>
              <div className="text-center">{PLAN_FEATURES.pro.features[i].included ? <span className="text-primary font-bold">✓</span> : <span className="text-gray-300">—</span>}</div>
              <div className="text-center">{PLAN_FEATURES.ai_plus.features[i].included ? <span className="text-amber-500 font-bold">✓</span> : <span className="text-gray-300">—</span>}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Payment Method ─── */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Ödeme Yöntemi</h2>
          <button className="text-primary text-[12px] font-bold hover:underline">+ Kart Ekle</button>
        </div>
        {isPaid ? (
          <div className="card-base p-5 flex items-center gap-4">
            <div className="w-12 h-8 rounded-md bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-[10px] font-black shrink-0">VISA</div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-text-primary">•••• •••• •••• 4242</p>
              <p className="text-[12px] text-text-secondary">Son kullanma: 04/28 • Varsayılan</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">Varsayılan</span>
          </div>
        ) : (
          <div className="card-base p-5 text-center text-text-secondary text-[14px] border-dashed">
            <p className="font-semibold">Kayıtlı ödeme yöntemi yok</p>
            <p className="text-[12px] mt-1">Pro'ya geçmek için kart ekle</p>
          </div>
        )}
      </section>

      {/* ─── Billing History ─── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Fatura Geçmişi</h2>
        {isPaid ? (
          <div className="card-base overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-bg-main text-text-secondary font-black text-[11px] uppercase tracking-wider border-b border-border-main">
                <tr>
                  <th className="px-5 py-3">Fatura No</th>
                  <th className="px-5 py-3">Tarih</th>
                  <th className="px-5 py-3">Tutar</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main text-[13px] font-medium">
                {MOCK_INVOICES.map(inv => (
                  <tr key={inv.id} className="hover:bg-bg-main/50 transition-colors">
                    <td className="px-5 py-4 text-text-secondary font-mono text-[12px]">{inv.id}</td>
                    <td className="px-5 py-4 text-text-primary">{inv.date}</td>
                    <td className="px-5 py-4 text-text-primary font-bold">{inv.amount}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 text-[11px] font-bold rounded-full bg-green-100 text-green-700">Ödendi</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-primary text-[12px] font-bold hover:underline flex items-center gap-1 ml-auto">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3"/></svg>
                        İndir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-base p-5 text-center text-text-secondary text-[14px]">
            <p className="font-semibold">Henüz fatura yok</p>
            <p className="text-[12px] mt-1">Ücretli bir plana geçtiğinde faturalar burada görünür</p>
          </div>
        )}
      </section>

      {/* ─── Danger Zone ─── */}
      {isPaid && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Abonelik Aksiyonları</h2>
          <div className="card-base p-5 border-error/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-bold text-text-primary">Aboneliği İptal Et</p>
              <p className="text-[12px] text-text-secondary mt-1">İptal etsen bile dönem sonuna kadar erişimin devam eder.</p>
            </div>
            <button className="text-error text-[13px] font-bold border border-error/30 px-4 py-2 rounded-lg hover:bg-error/5 transition-colors shrink-0">
              İptale Devam →
            </button>
          </div>
        </section>
      )}

      {/* ─── Upgrade Funnel (free users only) ─── */}
      {!isPaid && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-1">Odi Pro'ya Geç</h2>
          <div className="card-base overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary to-primary-hover" />
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[20px] font-extrabold text-text-primary">Odi Pro</h3>
                <p className="text-[22px] font-black text-primary">₺149<span className="text-[13px] text-text-secondary font-medium">/ay</span></p>
              </div>
              <ul className="flex flex-col gap-2 mb-6">
                {['AI Vet Chat (sınırsız)', 'Predictive Risk Engine', 'Nutrition & Beslenme Modülü', 'Sınırsız Pet Profili', 'Öncelikli Destek'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-[14px] text-text-primary font-medium">
                    <div className="w-5 h-5 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-black shrink-0">✓</div>
                    {f}
                  </li>
                ))}
              </ul>
              <button className="btn-primary w-full py-3.5 text-[15px] font-bold">
                Hemen Başla — ₺149/ay
              </button>
              <p className="text-center text-[11px] text-text-secondary mt-3">İstediğin zaman iptal edebilirsin • Gizli ücret yok</p>
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
