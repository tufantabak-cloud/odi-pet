import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { bookAppointment } from '@/features/appointments/actions'

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ pet?: string }>
}) {
  const user = await getSessionUser()
  const { pet: petId } = await searchParams
  const supabase = await createServerSupabaseClient()

  // Owner'ın petleri
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species')
    .eq('owner_id', user?.id)

  // Tüm klinikler (public read)
  const { data: clinics } = await supabase
    .from('clinics')
    .select('id, name, address, contact_phone')
    .order('name')

  // Minimum tarih (şimdi + 1 saat)
  const minDate = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto pb-10">
      <div className="flex flex-col gap-2 mb-8 border-b border-border-main pb-4">
        <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Randevu Al</h1>
        <p className="text-text-secondary">Pati dostunuz için klinik randevusu oluşturun.</p>
      </div>

      <div className="card-base p-6 sm:p-8">
        <form action={bookAppointment} className="flex flex-col gap-6">

          {/* Hayvan Seçimi */}
          <div className="flex flex-col gap-2">
            <label htmlFor="pet_id" className="text-[13px] font-bold text-text-primary">Pati Dostu *</label>
            <div className="relative">
              <select id="pet_id" name="pet_id" required defaultValue={petId ?? ''} className="input-base w-full appearance-none cursor-pointer">
                <option value="" disabled>Seçiniz</option>
                {pets?.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>

          {/* Klinik Seçimi */}
          <div className="flex flex-col gap-2">
            <label htmlFor="clinic_id" className="text-[13px] font-bold text-text-primary">Klinik *</label>
            {(!clinics || clinics.length === 0) ? (
              <div className="p-4 bg-warning/5 border border-warning/20 rounded-[14px]">
                <p className="text-[13px] text-warning font-semibold">Henüz sisteme kayıtlı klinik bulunmuyor.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {clinics.map(clinic => (
                  <label key={clinic.id}
                    className="flex items-start gap-4 p-4 border border-border-main rounded-[16px] cursor-pointer hover:border-primary/30 hover:bg-primary-soft/20 transition-all has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30">
                    <input type="radio" name="clinic_id" value={clinic.id} required className="mt-1 accent-[#4F2DBA] w-4 h-4 shrink-0"/>
                    <div>
                      <p className="font-bold text-text-primary">{clinic.name}</p>
                      {clinic.address && <p className="text-[13px] text-text-secondary">{clinic.address}</p>}
                      {clinic.contact_phone && <p className="text-[13px] text-primary font-semibold">{clinic.contact_phone}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Tarih & Saat */}
          <div className="flex flex-col gap-2">
            <label htmlFor="scheduled_at" className="text-[13px] font-bold text-text-primary">Tarih ve Saat *</label>
            <input
              id="scheduled_at"
              name="scheduled_at"
              type="datetime-local"
              required
              min={minDate}
              className="input-base"
            />
          </div>

          {/* Şikayet / Neden */}
          <div className="flex flex-col gap-2">
            <label htmlFor="owner_reason" className="text-[13px] font-bold text-text-primary">
              Ziyaret Nedeni <span className="text-text-secondary font-medium">(Opsiyonel)</span>
            </label>
            <textarea
              id="owner_reason"
              name="owner_reason"
              rows={3}
              placeholder="Örn: Yıllık kontrol, aşı yenileme, iştahsızlık..."
              className="input-base resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-main">
            <a href="/owner/appointments" className="btn-secondary px-6">Vazgeç</a>
            <button type="submit" className="btn-primary min-w-[160px] shadow-lg shadow-primary/20">
              Randevu Oluştur
            </button>
          </div>
        </form>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 bg-primary-soft/50 border border-primary/10 rounded-[16px]">
        <p className="text-[13px] text-primary font-semibold">
          💡 Randevunuz klinik onayına gönderilecektir. Onay durumunu "Randevularım" sayfasından takip edebilirsiniz.
        </p>
      </div>
    </div>
  )
}
