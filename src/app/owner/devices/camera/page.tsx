import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Kamera İzleme | Odi.Pet',
  description: 'Can dostunuzu canlı izleyin.',
}

export default async function CameraViewPage({ searchParams }: { searchParams: Promise<{ petId?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { petId } = await searchParams
  if (!petId) redirect('/owner/dashboard')

  const supabase = await createServerSupabaseClient()

  // Evcil hayvan bilgisini al
  const { data: pet } = await supabase
    .from('pets')
    .select('id, name, avatar_url, species')
    .eq('id', petId)
    .single()

  if (!pet) redirect('/owner/dashboard')

  // Kamera cihazını al
  const { data: device } = await supabase
    .from('devices')
    .select('*')
    .eq('pet_id', petId)
    .eq('type', 'camera')
    .maybeSingle()

  if (!device) {
    // Kamera kurulu değil, Empty State göster
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 w-full max-w-lg mx-auto">
        
        <div className="w-full flex items-center justify-between mb-8 px-4">
          <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Profile Dön
          </Link>
        </div>

        <div className="card-base p-10 flex flex-col items-center text-center gap-6 w-full border border-border-main/60 shadow-lg">
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-teal-50 to-emerald-50 flex items-center justify-center shadow-sm ring-4 ring-white">
            <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12 drop-shadow-md">
              <rect x="8" y="16" width="48" height="32" rx="8" fill="url(#cam-grad-body)" />
              <circle cx="32" cy="32" r="10" fill="#ffffff" />
              <circle cx="32" cy="32" r="6" fill="url(#cam-grad-lens)" />
              <path d="M42 22h6v6" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              <defs>
                <linearGradient id="cam-grad-body" x1="8" y1="16" x2="56" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#0D9488" /><stop offset="1" stopColor="#0F766E" /></linearGradient>
                <linearGradient id="cam-grad-lens" x1="26" y1="26" x2="38" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#374151" /><stop offset="1" stopColor="#111827" /></linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h2 className="text-[24px] font-extrabold text-text-primary mb-2">Kamera Bulunamadı</h2>
            <p className="text-[14px] text-text-secondary font-medium leading-relaxed max-w-[280px] mx-auto">
              {pet.name} için henüz bir akıllı kamera kurmadınız. Evdeki kameranızı hemen bağlayın.
            </p>
          </div>
          <Link
            href={`/owner/devices/camera/setup?petId=${pet.id}`}
            className="w-full btn-primary py-3.5 text-[15px] font-bold rounded-xl mt-2 flex items-center justify-center gap-2"
          >
            <span>+</span> Kamerayı Kur
          </Link>
        </div>
      </div>
    )
  }

  // Kamera var, Canlı Yayın Mock Arayüzü göster
  // MVP status mock
  const status: 'online' | 'offline' | 'connecting' | 'error' = device.status === 'online' ? 'online' : 'offline'
  
  // Brand parsing logic (mock for UI)
  const isRtsp = device.wifi_name?.includes('brand:rtsp')
  const brandDisplay = isRtsp ? 'RTSP Kamera' : device.name || 'Akıllı Kamera'

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
          Geri Dön
        </Link>
        
        <Link href={`/owner/devices/settings?petId=${pet.id}&type=camera`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-main text-[13px] font-bold text-text-secondary hover:text-primary hover:border-primary transition-all shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Ayarlar
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {/* Title Area */}
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-primary-soft to-white border border-border-main flex items-center justify-center overflow-hidden relative shadow-sm">
              {pet.avatar_url ? <Image src={pet.avatar_url} fill className="object-cover" alt="pet"/> : <span className="text-[20px] font-black text-primary">{pet.name.charAt(0)}</span>}
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight leading-tight">{brandDisplay}</h1>
              <p className="text-[13px] font-bold text-text-secondary mt-0.5">{pet.name} İzleniyor</p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex flex-col items-end gap-1">
            {status === 'online' && (
              <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 px-3 py-1.5 rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[12px] font-bold text-success uppercase tracking-wider">Online</span>
              </div>
            )}
            {status === 'offline' && (
              <div className="flex items-center gap-1.5 bg-error/10 border border-error/20 px-3 py-1.5 rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-error" />
                <span className="text-[12px] font-bold text-error uppercase tracking-wider">Offline</span>
              </div>
            )}
            <p className="text-[11px] text-text-secondary font-medium mr-1">Son aktif: 2 dk önce</p>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="w-full aspect-video bg-black rounded-[24px] overflow-hidden relative shadow-xl border border-black/10 group">
          
          {status === 'online' ? (
            <>
              {/* Fake Video Content (Placeholder for MVP) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <video 
                  src="https://www.w3schools.com/html/mov_bbb.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover opacity-90"
                />
              </div>

              {/* Overlays */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1.5 shadow-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/> CANLI
                </span>
                <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">
                  1080p 60fps
                </span>
              </div>

              {/* Security Note for Devs */}
              <div className="absolute bottom-4 left-4 text-white/50 text-[10px] font-mono pointer-events-none">
                [Odi.Pet Stream Proxy] 
              </div>
              
              {/* Controls overlay (hidden by default, shown on hover) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <div className="flex justify-between items-center w-full">
                  <button className="text-white hover:text-primary transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  </button>
                  <button className="text-white hover:text-primary transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-black text-white p-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="4"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <div className="text-center">
                <p className="text-[16px] font-bold text-white mb-1">Kameraya Bağlanılamıyor</p>
                <p className="text-[13px] text-white/60 max-w-xs">Cihaz çevrimdışı görünüyor. Fişe takılı ve ağa bağlı olduğundan emin olun.</p>
              </div>
              <button className="bg-white/10 hover:bg-white/20 text-white text-[13px] font-bold py-2.5 px-6 rounded-xl border border-white/20 transition-colors mt-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Yeniden Bağlan
              </button>
            </div>
          )}

        </div>
        
        {/* Quick Features */}
        {status === 'online' && (
          <div className="grid grid-cols-4 gap-3 mt-2">
            <button className="flex flex-col items-center justify-center gap-2 bg-surface border border-border-main p-3 rounded-2xl hover:bg-primary-soft/50 hover:border-primary/40 hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              </div>
              <span className="text-[12px] font-bold text-text-secondary group-hover:text-primary transition-colors">Seslen</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-surface border border-border-main p-3 rounded-2xl hover:bg-primary-soft/50 hover:border-primary/40 hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <span className="text-[12px] font-bold text-text-secondary group-hover:text-primary transition-colors">Fotoğraf</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-surface border border-border-main p-3 rounded-2xl hover:bg-primary-soft/50 hover:border-primary/40 hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </div>
              <span className="text-[12px] font-bold text-text-secondary group-hover:text-primary transition-colors">Kayıt</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-surface border border-border-main p-3 rounded-2xl hover:bg-primary-soft/50 hover:border-primary/40 hover:shadow-md transition-all group hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span className="text-[12px] font-bold text-text-secondary group-hover:text-primary transition-colors">Hareket</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
