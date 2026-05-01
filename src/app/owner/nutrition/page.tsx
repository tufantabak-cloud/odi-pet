import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ pet?: string }> }) {
  const user = await getSessionUser()
  const { pet: petId } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: pets } = await supabase.from('pets').select('id, name').eq('owner_id', user?.id)
  const activePetId = petId ?? pets?.[0]?.id

  const { data: plans } = activePetId
    ? await supabase.from('nutrition_plans').select('*').eq('pet_id', activePetId)
    : { data: [] }

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Beslenme</h1>
        <p className="text-text-secondary mt-1 text-[16px] font-medium">Günlük öğün planı ve stok durumu</p>
      </div>

      {/* Pet Switcher */}
      {pets && pets.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {pets.map(p => (
            <a key={p.id} href={`/owner/nutrition?pet=${p.id}`}
              className={`px-4 py-2 rounded-full text-[13px] font-bold shrink-0 border transition-colors
                ${p.id === activePetId ? 'bg-primary text-white border-primary' : 'bg-surface border-border-main text-text-secondary hover:border-primary/30'}`}>
              {p.name}
            </a>
          ))}
        </div>
      )}

      {(!plans || plans.length === 0) ? (
        <div className="card-base p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-warning/10 rounded-[18px] flex items-center justify-center text-warning mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" x2="6" y1="1" y2="4"/><line x1="10" x2="10" y1="1" y2="4"/><line x1="14" x2="14" y1="1" y2="4"/></svg>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">Beslenme planı oluşturulmamış</h3>
          <p className="text-text-secondary text-[14px] mt-2 max-w-xs">Veterinerin önerisini ekleyerek öğün takibine başlayın.</p>
          <button className="btn-primary mt-6 px-8">Beslenme Planı Ekle</button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {plans.map(plan => {
            const dailyGr = (plan.portion_gr ?? 0) * (plan.times_per_day ?? 1)
            const daysLeft = dailyGr > 0 ? Math.floor((plan.food_stock_gr ?? 0) / dailyGr) : null
            const stockCritical = daysLeft !== null && daysLeft <= 3

            return (
              <div key={plan.id} className={`card-base p-6 sm:p-8 ${stockCritical ? 'border-l-4 border-l-error' : ''}`}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-[18px] font-extrabold text-text-primary">{plan.meal_name}</h3>
                    <p className="text-text-secondary text-[14px] mt-1">
                      {plan.portion_gr}g × {plan.times_per_day} öğün/gün = {dailyGr}g günlük
                    </p>
                  </div>
                  {stockCritical && (
                    <span className="bg-error/10 text-error border border-error/20 text-[11px] font-bold px-3 py-1 rounded-full shrink-0">
                      ⚠️ Stok Kritik
                    </span>
                  )}
                </div>

                {/* Stock Bar */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-[13px] font-bold text-text-secondary">Mevcut Stok</span>
                    <span className="text-[13px] font-bold text-text-primary">{plan.food_stock_gr}g
                      {daysLeft !== null && <span className="text-text-secondary font-medium"> (~{daysLeft} gün)</span>}
                    </span>
                  </div>
                  <div className="h-2.5 bg-bg-main rounded-full overflow-hidden border border-border-main">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${stockCritical ? 'bg-error' : 'bg-success'}`}
                      style={{ width: `${Math.min(100, ((plan.food_stock_gr ?? 0) / Math.max(1, (plan.food_stock_gr ?? 0) + dailyGr * 7)) * 100)}%` } as React.CSSProperties}
                    />
                  </div>
                </div>

                {stockCritical && (
                  <button className="btn-primary mt-5 w-full sm:w-auto px-8">Sipariş Ver</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
