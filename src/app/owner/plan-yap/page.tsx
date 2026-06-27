"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  ChevronRight,
  Loader2,
  ArrowLeft
} from 'lucide-react';

// Özel Yarı-3D İkon Bileşeni
const Semi3DIcon = ({ svgPath, className }: { svgPath: React.ReactNode, className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <defs>
      <filter id="semi-3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="currentColor" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#semi-3d-shadow)">
      {svgPath}
    </g>
  </svg>
);

// Evcil Hayvan Dünyası İkonları
const PetIcons = {
  FoodBowl: <path d="M4 14C4 16.2091 9.37258 18 12 18C14.6274 18 20 16.2091 20 14V12C20 12 18 14 12 14C6 14 4 12 4 12V14Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />,
  Syringe: <path d="M10.5 4.5L14.5 8.5M4 15V19H8L18.5 8.5C19.3284 7.67157 19.3284 6.32843 18.5 5.5V5.5C17.6716 4.67157 16.3284 4.67157 15.5 5.5L4 15.5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>,
  Frisbee: <path d="M12 4C5.37258 4 2 8 2 8C2 8 5.37258 12 12 12C18.6274 12 22 8 22 8C22 8 18.6274 4 12 4Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>,
  Whistle: <path d="M12 4V12M12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4ZM14.5 12L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>,
  Comb: <path d="M8 4V20M12 4V20M16 4V20M4 4H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>,
  Bed: <path d="M4 12H20M4 12V8C4 6.89543 4.89543 6 6 6H18C19.1046 6 20 6.89543 20 8V12M4 12V18M20 12V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>,
  GroupPets: <path d="M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14ZM5 20V18C5 15.7909 6.79086 14 9 14H15C17.2091 14 19 15.7909 19 18V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>,
  DefaultAvatar: <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12ZM4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
};

// 7 Gerçek Kategori (API Uyumlu)
const CATEGORIES = [
  { key: 'saglik', title: 'Sağlık Takibi', desc: 'Kilo ölçümü, semptom takibi, ilaç kullanımı planlayın.', iconPath: PetIcons.DefaultAvatar, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100 hover:border-rose-200', gradient: 'from-rose-500 to-red-500' },
  { key: 'asi', title: 'Aşı Takibi', desc: 'Aşı ve bağışıklık hatırlatmaları oluşturun.', iconPath: PetIcons.Syringe, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100 hover:border-blue-200', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'parazit', title: 'Parazit Koruması', desc: 'İç ve dış parazit uygulama rutinleri planlayın.', iconPath: PetIcons.Whistle, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100 hover:border-teal-200', gradient: 'from-teal-500 to-emerald-500' },
  { key: 'bakim', title: 'Bakım Rutini', desc: 'Tıraş, banyo, tırnak kesimi ve genel hijyen planlayın.', iconPath: PetIcons.Comb, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50', border: 'border-fuchsia-100 hover:border-fuchsia-200', gradient: 'from-fuchsia-500 to-pink-500' },
  { key: 'beslenme', title: 'Beslenme Planı', desc: 'Günlük kuru/yaş mama ve diyet planları oluşturun.', iconPath: PetIcons.FoodBowl, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100 hover:border-amber-200', gradient: 'from-amber-500 to-orange-500' },
  { key: 'hijyen', title: 'Hijyen Takibi', desc: 'Kum kabı temizliği, diş fırçalama, kulak bakımı planlayın.', iconPath: PetIcons.Bed, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200 hover:border-slate-300', gradient: 'from-slate-500 to-slate-700' },
  { key: 'aktivite', title: 'Aktivite & Egzersiz', desc: 'Yürüyüş, oyun seansları ve eğitim rutinleri planlayın.', iconPath: PetIcons.Frisbee, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100 hover:border-emerald-200', gradient: 'from-emerald-500 to-green-500' },
];

function PlanYapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlPetId = searchParams.get('pet_id');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [selectedPet, setSelectedPet] = useState<string | null>(urlPetId || null);
  const [pets, setPets] = useState<{ id: string, name: string, type: string, avatar_url?: string }[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);

  useEffect(() => {
    async function loadPets() {
      const { data } = await supabase.from('pets').select('id, name, species, avatar_url');
      if (data && data.length > 0) {
        setPets(data.map(p => ({
          id: p.id,
          name: p.name,
          type: p.species || 'Evcil Hayvan',
          avatar_url: p.avatar_url
        })));
        
        if (data.length === 1 && !urlPetId) {
          setSelectedPet(data[0].id);
          router.replace(`?pet_id=${data[0].id}`);
        }
      }
      setIsLoadingPets(false);
    }
    loadPets();
  }, [supabase, router, urlPetId]);

  const activePetInfo = pets.find(p => p.id === selectedPet);

  // Step 0: Pet Selection
  if (!selectedPet) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:justify-center transition-colors duration-700">
        <div className="p-6 max-w-md mx-auto w-full animate-in fade-in duration-300 pt-12 md:pt-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-100 rounded-2xl">
              <Semi3DIcon svgPath={PetIcons.DefaultAvatar} className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.back()}
                className="w-11 h-11 rounded-xl bg-bg-main border border-border-main flex items-center justify-center hover:bg-surface-hover transition-colors active:scale-95"
                aria-label="Geri dön"
              >
                <ArrowLeft size={20} className="text-text-secondary" />
              </button>
              <h1 className="text-[22px] font-black text-text-primary">Plan Yap</h1>
            </div>
          </div>
          <p className="text-gray-500 mb-8 ml-1">Kimin için plan oluşturuyoruz?</p>
          
          {isLoadingPets ? (
            <div className="space-y-4 animate-pulse">
               <div className="h-20 bg-gray-200 rounded-3xl" />
               <div className="h-20 bg-gray-200 rounded-3xl" />
            </div>
          ) : pets.length > 0 ? (
            <div className="space-y-4" role="list">
              {pets.map(pet => (
                <button
                  key={pet.id}
                  role="listitem"
                  aria-label={`${pet.name} profili için plan oluştur`}
                  onClick={() => {
                    setSelectedPet(pet.id);
                    router.push(`?pet_id=${pet.id}`);
                  }}
                  className="w-full flex items-center p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                >
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl group-hover:scale-110 shadow-inner transition-all overflow-hidden border border-indigo-100/50">
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <Semi3DIcon svgPath={PetIcons.DefaultAvatar} className="w-7 h-7 text-indigo-400" />
                    )}
                  </div>
                  <div className="ml-4 flex flex-col items-start">
                    <span className="font-bold text-gray-800 text-lg">{pet.name}</span>
                    <span className="text-sm text-gray-400">{pet.type}</span>
                  </div>
                  <ChevronRight className="ml-auto w-6 h-6 text-gray-300 group-hover:text-indigo-600 transition-colors" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-500">
              Kayıtlı evcil hayvanınız bulunamadı. Lütfen önce profil ekleyin.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Category Selection
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:justify-center p-6 transition-colors duration-700">
      <div className="max-w-md mx-auto w-full flex flex-col animate-in fade-in duration-300">
        
        {/* Active Pet Header */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 overflow-hidden border border-indigo-100/50 shrink-0">
              {activePetInfo?.avatar_url ? (
                <img src={activePetInfo.avatar_url} alt={activePetInfo.name} className="w-full h-full object-cover" />
              ) : (
                <Semi3DIcon svgPath={PetIcons.DefaultAvatar} className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Aktif Profil</p>
              <h2 className="text-sm font-black text-gray-800">{activePetInfo?.name}</h2>
            </div>
          </div>
          {pets.length > 1 && (
            <button 
              onClick={() => {
                setSelectedPet(null);
                router.push('/owner/plan-yap');
              }}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors px-3 py-1.5 rounded-xl"
            >
              Değiştir
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 mb-2">
          <button 
            onClick={() => {
              if (selectedPet) {
                router.push(`/owner/pets/${selectedPet}`)
              } else {
                router.push('/owner/dashboard')
              }
            }}
            className="w-11 h-11 bg-white rounded-xl shadow-sm text-gray-500 hover:text-gray-700 flex items-center justify-center border border-gray-100 transition-all active:scale-95"
            aria-label="Geri dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-gray-900">Rutin Planla</h1>
        </div>
        <p className="text-gray-500 text-xs mb-6 ml-1">Lütfen plan oluşturmak istediğiniz kategoriyi seçin.</p>

        {/* Categories List */}
        <div className="space-y-3" role="list">
          {CATEGORIES.map(category => (
            <button
              key={category.key}
              role="listitem"
              aria-label={`${category.title} plan sihirbazını başlat`}
              onClick={() => {
                if (category.key === 'beslenme') {
                  router.push(`/owner/pets/${selectedPet}/nutrition`);
                } else {
                  router.push(`/owner/plan-yap/${category.key}?pet_id=${selectedPet}`);
                }
              }}
              className="w-full flex items-start p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all group focus:outline-none focus:ring-4 focus:ring-slate-300/30 text-left"
            >
              <div className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl ${category.bg} ${category.color} group-hover:scale-105 transition-all shadow-inner`}>
                <Semi3DIcon svgPath={category.iconPath} className="w-6 h-6" />
              </div>
              <div className="ml-4 flex-1">
                <span className="font-bold text-gray-800 text-sm block">{category.title}</span>
                <span className="text-[11px] text-gray-400 mt-0.5 block leading-relaxed">{category.desc}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors self-center ml-2" aria-hidden="true" />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function PlanYapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col md:justify-center transition-colors duration-700">
        <div className="p-6 max-w-md mx-auto w-full space-y-8 animate-pulse pt-20">
          <div className="h-4 bg-gray-200 rounded-full w-full" />
          <div className="h-24 bg-gray-200 rounded-[2rem] w-24 mx-auto" />
          <div className="h-8 bg-gray-200 rounded-full w-1/2 mx-auto" />
          <div className="space-y-4">
             <div className="h-20 bg-gray-200 rounded-3xl" />
             <div className="h-20 bg-gray-200 rounded-3xl" />
          </div>
        </div>
      </div>
    }>
      <PlanYapContent />
    </Suspense>
  );
}
