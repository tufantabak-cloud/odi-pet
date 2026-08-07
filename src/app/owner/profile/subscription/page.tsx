import Link from 'next/link'

import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle2, Crown, Sparkles, Shield, CreditCard, FileText } from 'lucide-react'

import ManageSubscriptionButton from './ManageSubscriptionButton'
import UpgradeButton from './UpgradeButton'

const PLAN_FEATURES = {
  free: {
    name: 'Odi Free',
    badge: 'bg-slate-100 text-slate-600',
    features: [
      'Temel pet profili',
      'Aşı takvimi',
      'Sağlık kayıtları',
    ],
  },
  pro: {
    name: 'Odi Pro',
    badge: 'bg-primary/10 text-primary',
    features: [
      'AI Vet Chat',
      'Risk ve beslenme içgörüleri',
      'Sınırsız pet profili',
    ],
  },
  ai_plus: {
    name: 'Odi AI+',
    badge: 'bg-amber-100 text-amber-700',
    features: [
      'Pro planındaki her şey',
      'Yüksek AI kullanım limitleri',
      'Aile paylaşımı ve PDF raporları',
    ],
  },
} as const

type PlanKey = keyof typeof PLAN_FEATURES

function formatPrice(value: number | null | undefined, currency = 'TRY') {
  if (value == null) return 'Fiyat ayarlanmadı'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const params = await searchParams

  const [{ data: subscription }, { data: plans }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('*')
      .eq('profile_id', profile?.id ?? '')
      .maybeSingle(),
    supabase
      .from('subscription_plans')
      .select('plan_key, price_monthly, currency, stripe_price_id_monthly')
      .in('plan_key', ['pro', 'ai_plus'])
      .eq('is_active', true),
  ])

  const currentPlan: PlanKey =
    (subscription?.['status'] === 'active' || subscription?.['status'] === 'trialing') 
      ? ((subscription?.['plan'] as PlanKey) || 'pro') 
      : 'free'
  const planInfo = PLAN_FEATURES[currentPlan]
  const isPaid = currentPlan !== 'free'
  const subscriptionStatus = subscription?.['status'] ?? 'active'
  const hasBillingAccount = Boolean(subscription?.stripe_customer_id)
  const renewDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  const planCatalog = new Map(plans?.map((plan) => [plan.plan_key, plan]) ?? [])

  return (
    <div className="mx-auto flex w-full flex-col gap-6 pb-20 font-sans">
      <Link
        href="/owner/profile"
        className="-mb-2 flex items-center gap-2 text-sm font-bold text-text-secondary transition-all hover:text-primary active:scale-[0.98]"
      >
        <ArrowLeft className="w-4 h-4" /> Profilime dön
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
          Abonelik ve Ödeme
        </h1>
        <p className="mt-1 text-xs font-medium text-text-secondary">
          Planını gör, güvenli ödemeye geç veya Stripe üzerinden yönet.
        </p>
      </div>

      {params.checkout === 'success' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Ödeme tamamlandı. Abonelik durumun birkaç saniye içinde güncellenecek.
        </div>
      )}
      {params.checkout === 'cancelled' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
          Ödeme tamamlanmadı; planında herhangi bir değişiklik yapılmadı.
        </div>
      )}

      <section className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
        <div
          className={`h-1.5 w-full ${
            currentPlan === 'ai_plus'
              ? 'bg-gradient-to-r from-amber-400 to-orange-400'
              : currentPlan === 'pro'
                ? 'bg-gradient-to-r from-primary to-primary-hover'
                : 'bg-slate-200'
          }`}
        />
        <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${planInfo.badge}`}
              >
                {planInfo.name}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  subscriptionStatus === 'active' ||
                  subscriptionStatus === 'trialing'
                    ? 'bg-emerald-50 text-emerald-700'
                    : subscriptionStatus === 'past_due'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-rose-50 text-error'
                }`}
              >
                {subscriptionStatus === 'active'
                  ? '● Aktif'
                  : subscriptionStatus === 'trialing'
                    ? '● Deneme'
                    : subscriptionStatus === 'past_due'
                      ? '● Ödeme gerekli'
                      : '● Pasif'}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-text-secondary">
              {planInfo.features.map((feature) => (
                <li key={feature} className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {renewDate && (
              <p className="mt-3 text-xs font-medium text-text-secondary">
                Mevcut dönem sonu: <strong>{renewDate}</strong>
              </p>
            )}
          </div>

          {hasBillingAccount ? (
            <ManageSubscriptionButton className="btn-primary px-6 py-3 text-sm rounded-2xl active:scale-[0.98]" />
          ) : (
            <p className="max-w-xs text-xs text-text-secondary font-medium">
              Aşağıdaki planlardan birini seçtiğinde güvenli Stripe ödeme
              sayfasına yönlendirilirsin.
            </p>
          )}
        </div>
      </section>

      {!isPaid && (
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
            Planını seç
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(['pro', 'ai_plus'] as const).map((planKey) => {
              const catalogPlan = planCatalog.get(planKey)
              const details = PLAN_FEATURES[planKey]
              const isConfigured = Boolean(
                catalogPlan?.stripe_price_id_monthly ||
                  (planKey === 'pro'
                    ? process.env.STRIPE_PRICE_PRO_MONTHLY
                    : process.env.STRIPE_PRICE_AI_PLUS)
              )

              return (
                <div key={planKey} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
                  <div>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
                          {details.name}
                          {planKey === 'ai_plus' && <Sparkles className="w-4 h-4 text-amber-500" />}
                        </h3>
                        <p className="mt-1 text-2xl font-black text-primary">
                          {formatPrice(
                            catalogPlan?.price_monthly,
                            catalogPlan?.currency ?? 'TRY'
                          )}
                          {catalogPlan?.price_monthly != null && (
                            <span className="text-xs font-medium text-text-secondary">
                              /ay
                            </span>
                          )}
                        </p>
                      </div>
                      {planKey === 'ai_plus' && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-2xs font-bold text-amber-800 uppercase tracking-wider">
                          EN GELİŞMİŞ
                        </span>
                      )}
                    </div>
                    <ul className="mb-6 flex flex-1 flex-col gap-2 text-xs font-medium text-text-primary">
                      {details.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <UpgradeButton
                    plan={planKey}
                    disabled={!isConfigured}
                    label={
                      isConfigured
                        ? `${details.name} ile Devam Et →`
                        : 'Ödeme ayarı bekleniyor'
                    }
                    className="btn-primary w-full px-5 py-3 text-sm rounded-2xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Ödeme yöntemi
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary font-medium">
            Kart bilgilerin Odi.Pet tarafından tutulmaz. Ekleme ve güncelleme
            işlemleri güvenli Stripe alanında yapılır.
          </p>
          {hasBillingAccount && (
            <ManageSubscriptionButton
              label="Ödeme Yöntemini Yönet"
              className="mt-4 text-xs font-bold text-primary hover:underline block"
            />
          )}
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Faturalar ve iptal
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary font-medium">
            Gerçek faturalarını görüntüleme, indirme, plan değiştirme ve iptal
            işlemleri Stripe müşteri portalından yönetilir.
          </p>
          {hasBillingAccount ? (
            <ManageSubscriptionButton
              label="Fatura ve Abonelikleri Aç"
              className="mt-4 text-xs font-bold text-primary hover:underline block"
            />
          ) : (
            <p className="mt-4 text-xs font-semibold text-text-secondary">
              Henüz fatura bulunmuyor.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
