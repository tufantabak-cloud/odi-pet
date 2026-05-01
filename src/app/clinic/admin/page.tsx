import { requireRole } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClinicAdminPage() {
  const profile = await requireRole(['clinic_admin'])
  if (!profile) redirect('/clinic/dashboard')

  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('clinic_memberships').select('clinic_id, clinics(*)').eq('profile_id', profile.id)

  const clinic = (memberships?.[0]?.clinics as any) ?? null
  const clinicId = memberships?.[0]?.clinic_id ?? null

  // Tüm üyeler
  const { data: members } = clinicId
    ? await supabase
        .from('clinic_memberships')
        .select('*, profiles(first_name, last_name, role)')
        .eq('clinic_id', clinicId)
    : { data: [] }

  // Stats
  const { count: aptCount } = await supabase
    .from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId ?? '')
  const { count: petCount } = await supabase
    .from('appointments').select('pet_id', { count: 'exact', head: true }).eq('clinic_id', clinicId ?? '')

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Klinik Yönetimi</h1>
        <p className="text-text-secondary mt-1 text-[15px] font-medium">Admin — {clinic?.name ?? '—'}</p>
      </div>

      {/* Clinic Info Card */}
      {clinic && (
        <div className="card-base p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <h2 className="text-[18px] font-extrabold text-text-primary">Klinik Bilgileri</h2>
            <button className="btn-secondary text-[13px] py-2 px-4">Düzenle</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Klinik Adı', value: clinic.name },
              { label: 'İletişim E-postası', value: clinic.contact_email ?? '—' },
              { label: 'Telefon', value: clinic.contact_phone ?? '—' },
              { label: 'Adres', value: clinic.address ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 bg-bg-main rounded-[14px] border border-border-main">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1">{label}</p>
                <p className="font-semibold text-text-primary">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        <div className="card-base p-6 border-l-4 border-l-primary flex flex-col">
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Toplam Randevu</p>
          <p className="text-[40px] font-black text-text-primary leading-none mt-2">{aptCount ?? 0}</p>
        </div>
        <div className="card-base p-6 border-l-4 border-l-success flex flex-col">
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Kayıtlı Hasta</p>
          <p className="text-[40px] font-black text-text-primary leading-none mt-2">{petCount ?? 0}</p>
        </div>
        <div className="card-base p-6 border-l-4 border-l-warning flex flex-col col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Personel Sayısı</p>
          <p className="text-[40px] font-black text-text-primary leading-none mt-2">{members?.length ?? 0}</p>
        </div>
      </div>

      {/* Staff List */}
      <div className="card-base p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-extrabold text-text-primary">Personel Listesi</h2>
          <button className="btn-primary text-[13px] py-2 px-4 gap-2 flex items-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Personel Davet Et
          </button>
        </div>

        {(!members || members.length === 0) ? (
          <p className="text-text-secondary text-[14px]">Henüz kayıtlı personel yok.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((m: any) => {
              const p = m.profiles
              const isAdmin = p?.role === 'clinic_admin'
              return (
                <div key={m.id} className="flex items-center gap-4 p-4 rounded-[16px] border border-border-main bg-surface hover:border-primary/20 transition-colors">
                  <div className="w-11 h-11 rounded-full bg-primary-soft flex items-center justify-center text-primary font-extrabold text-[15px] shrink-0">
                    {p?.first_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex flex-col flex-1">
                    <p className="font-bold text-text-primary">{p?.first_name} {p?.last_name}</p>
                    <p className="text-[13px] text-text-secondary capitalize">{p?.role?.replace('_', ' ')}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isAdmin ? 'bg-primary-soft text-primary' : 'bg-border-main text-text-secondary'}`}>
                    {isAdmin ? 'Admin' : 'Personel'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
