'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import LogbookSheet from '@/components/tasks/LogbookSheet'
import VaccineSelectorSheet from '@/components/tasks/VaccineSelectorSheet'
import { Suspense } from 'react'

const actionMenuItems = [
  { 
    label: 'Plan Yap', 
    actionKey: 'plan-yap',
    gradient: 'from-fuchsia-500 to-pink-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
        <line x1="10" x2="14" y1="16" y2="16"/>
        <line x1="12" x2="12" y1="14" y2="18"/>
      </svg>
    )
  },
  { 
    label: 'Sağlık Kaydı / Aşı', 
    actionKey: 'vaccine',
    gradient: 'from-blue-500 to-red-400',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
        <path d="m18 2 4 4" />
        <path d="m17 7 3-3" />
        <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-1-1-3.4L15 5Z" />
        <path d="m9 11 4 4" />
        <path d="m5 19-3 3" />
        <path d="m14 4 6 6" />
      </svg>
    )
  },
  { 
    label: 'Akıllı Tarama', 
    actionKey: 'scanner',
    gradient: 'from-indigo-500 to-purple-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 12h10" />
      </svg>
    )
  },
  { 
    label: 'Durum Kaydet', 
    actionKey: 'logbook',
    gradient: 'from-teal-400 to-emerald-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h2" />
        <path d="M8 17h2" />
        <path d="M14 13h2" />
        <path d="M14 17h2" />
      </svg>
    )
  },
]

const tabs = [
  {
    href: '/owner/dashboard',
    label: 'Anasayfa',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: '/owner/services',
    label: 'Hizmetler',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? '0.2' : '0'} />
      </svg>
    ),
  },
  {
    isAction: true,
    href: '#',
    label: '',
    icon: (active: boolean, isOpen?: boolean) => (
      <div className={`w-[52px] h-[52px] bg-[#0F172A] rounded-full flex items-center justify-center text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] active:scale-95 transition-all duration-300 -translate-y-3 ${isOpen ? 'rotate-[135deg]' : 'hover:scale-105'}`}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    ),
  },
  {
    href: '/owner/social',
    label: 'Sosyal',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? '0.2' : '0'} />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/owner/profile',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? '0.2' : '0'} />
      </svg>
    ),
  },
]

function BottomNavContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const [pets, setPets] = useState<any[]>([])
  const [isPetSelectorOpen, setIsPetSelectorOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    async function fetchPets() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('pet_owners')
        .select('pets(id, name, avatar_url)')
        .eq('profile_id', user.id)
      if (data) {
        setPets(data.map((d: any) => d.pets).filter(Boolean))
      }
    }
    fetchPets()
  }, [supabase])

  const handleActionClick = (actionKey: string) => {
    setIsMenuOpen(false)
    if (actionKey === 'scanner') {
      router.push('/owner/scanner')
      return
    }
    
    if (pets.length > 1) {
      setPendingAction(actionKey)
      setIsPetSelectorOpen(true)
    } else {
      const petId = pets.length === 1 ? pets[0].id : ''
      if (actionKey === 'plan-yap') {
        router.push(`/owner/plan-yap${petId ? '?pet_id=' + petId : ''}`)
      } else {
        router.push(`?modal=${actionKey}${petId ? '&petId='+petId : ''}`)
      }
    }
  }

  const handlePetSelect = (petId: string) => {
    if (pendingAction) {
      if (pendingAction === 'plan-yap') {
        router.push(`/owner/plan-yap?pet_id=${petId}`)
      } else {
        router.push(`?modal=${pendingAction}&petId=${petId}`)
      }
      setIsPetSelectorOpen(false)
      setPendingAction(null)
    }
  }

  if (pathname.includes('/plan-yap')) return null;

  return (
    <>
      {/* + Menü Overlay */}
      {mounted && isMenuOpen && createPortal(
        <div className="fixed inset-0 z-[9990] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="relative z-[9991] w-full max-w-lg mx-auto px-6 pb-[100px] flex flex-col items-end gap-3 pointer-events-none">
            {actionMenuItems.map((item, index) => (
              <button
                key={item.label}
                id={`action-btn-${item.actionKey}`}
                onClick={() => handleActionClick(item.actionKey as string)}
                className={`pointer-events-auto bg-gradient-to-r ${item.gradient} text-white px-5 py-3.5 rounded-[20px] shadow-xl font-bold text-[14.5px] flex items-center justify-start gap-4 transition-all duration-300 animate-in slide-in-from-bottom-8 fade-in hover:scale-105 active:scale-95 border border-white/20 w-64 relative overflow-hidden`}
                style={{ animationDelay: `${(actionMenuItems.length - 1 - index) * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Yarı saydam beyaz overlay ışıltısı */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                
                {/* İkon Konteyneri */}
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/25 backdrop-blur-md shadow-inner relative z-10">
                  {item.icon}
                </div>
                
                {/* Etiket */}
                <span className="relative z-10 tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Pet Selector Drawer */}
      {mounted && isPetSelectorOpen && createPortal(
        <div className="fixed inset-0 z-[9992] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsPetSelectorOpen(false)}
          />
          <div className="relative z-[9993] w-full max-w-lg mx-auto bg-white rounded-t-[30px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 pb-8">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-800 text-center mb-6">İşlem Yapılacak Peti Seçin</h3>
            <div className="grid grid-cols-2 gap-4">
              {pets.map(pet => (
                <button
                  key={pet.id}
                  onClick={() => handlePetSelect(pet.id)}
                  className="flex flex-col items-center gap-3 p-4 rounded-[20px] bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                        {pet.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-slate-700">{pet.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Global Modals from URL Params */}
      {mounted && searchParams.get('modal') === 'logbook' && searchParams.get('petId') && createPortal(
        <LogbookSheet 
          petId={searchParams.get('petId') as string} 
          onClose={() => router.replace(pathname, { scroll: false })} 
        />,
        document.body
      )}

      {mounted && searchParams.get('modal') === 'vaccine' && searchParams.get('petId') && createPortal(
        <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => router.replace(pathname, { scroll: false })} />
          <div className="relative w-full max-w-lg mx-auto bg-surface rounded-t-[30px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 pb-8 h-[80vh]">
            <VaccineSelectorSheet
              species={pets.find(p => p.id === searchParams.get('petId'))?.type || 'dog'}
              selectedVaccineCode={null}
              onSelect={() => router.replace(pathname, { scroll: false })}
              onBack={() => router.replace(pathname, { scroll: false })}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-border-main/80 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-5 w-full max-w-lg mx-auto">
          {tabs.map((tab: any) => {
            const isActive = tab.href === '/owner/dashboard'
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(tab.href + '/')

            if (tab.isAction) {
              return (
                <button
                  key="action-btn"
                  id="nav-action-btn"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex flex-col items-center justify-center gap-1.5 py-1 px-1 transition-all duration-300 select-none cursor-pointer focus:outline-none z-[10000]"
                >
                  <div className="flex items-center justify-center w-6 h-6">
                    {tab.icon(false, isMenuOpen)}
                  </div>
                </button>
              )
            }

            // Map href to a selector-friendly ID prefix
            const elementId = tab.href === '/owner/dashboard' ? 'nav-home' 
                            : tab.href === '/owner/profile' ? 'nav-profile' 
                            : undefined;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                id={elementId}
                className={`flex flex-col items-center justify-center gap-1.5 py-1 px-1 transition-all duration-300 select-none cursor-pointer
                  ${isActive ? 'text-[#E05397] scale-105' : 'text-[#8E8E93] hover:text-[#5c5c60]'}`}
              >
                <div className="flex items-center justify-center w-6 h-6">
                  {tab.icon(isActive)}
                </div>
                {tab.label && (
                  <span className="text-[11px] font-semibold tracking-tight transition-colors duration-300">
                    {tab.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  )
}
