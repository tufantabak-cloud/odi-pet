'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VaccineCatalogItem } from '@/lib/tasks/vaccineCatalog';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { SmartScanner, ParsedScannerData } from '@/components/ui/SmartScanner';
import Image from 'next/image';

export type VaccineOption = VaccineCatalogItem & {
  isParasite?: boolean;
  protection_duration_days?: number;
  image_url?: string;
  description?: string;
  type?: string;
  application_method?: string;
  active_ingredient?: string;
  brand?: string;
  /** vaccine_brands.id — aşı markası seçildiyse dolu, protokolü kendi yazdıysa boş */
  brandId?: string;
};

interface VaccineSelectorSheetProps {
  pickerType?: 'vaccine' | 'parasite';
  subCategory?: string | null;
  /** 'dog' | 'cat' | null — null means unknown/show all */
  species: string | null;
  selectedVaccineCode: string | null;
  onSelect: (vaccine: VaccineOption) => void;
  onBack: () => void;
}

const GROUP_LABEL: Record<string, string> = {
  core: 'Temel (Önerilen)',
  optional: 'Ek (Risk Durumuna Göre)',
};

const GROUP_COLOR: Record<string, string> = {
  core: 'bg-blue-100 text-blue-600',
  optional: 'bg-slate-100 text-slate-500',
};

export default function VaccineSelectorSheet({
  pickerType = 'vaccine',
  subCategory,
  species,
  selectedVaccineCode,
  onSelect,
  onBack,
}: VaccineSelectorSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [dbProducts, setDbProducts] = useState<VaccineOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [addForm, setAddForm] = useState({ brand: '', name: '', type: 'internal', method: 'oral', active_ingredient: '', duration: '' });
  const [addDurationUnit, setAddDurationUnit] = useState<'hour' | 'day' | 'week' | 'month' | 'year'>('day');
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');

  const handleScanResult = (result: ParsedScannerData | { parsed: ParsedScannerData }) => {
    const parsed: ParsedScannerData = (result as any).parsed && typeof (result as any).parsed === 'object' 
      ? (result as any).parsed 
      : (result as ParsedScannerData);
    if (!parsed) return;

    // Parazit ambalajı için
    if (parsed.title || parsed.brand || parsed.parasite_type) {
      if (parsed.duration_days || parsed.duration_months) {
        setAddDurationUnit('day');
      }
      setAddForm(prev => ({
        ...prev,
        name: parsed.title || parsed.product_name || prev.name,
        brand: parsed.brand || prev.brand,
        active_ingredient: parsed.active_ingredient || parsed.ingredient || prev.active_ingredient,
        duration: parsed.duration_days
          ? String(parsed.duration_days)
          : parsed.duration_months
            ? String(parsed.duration_months * 30)
            : prev.duration,
        method: parsed.application_method || prev.method,
        type: parsed.parasite_type === 'İç Parazit' ? 'internal'
            : parsed.parasite_type === 'Dış Parazit' ? 'external'
            : prev.type,
      }))
    }

    // Aşı karnesi için
    if (parsed.vaccine_name || parsed.vaccine_brand || parsed.title) {
      setAddForm(prev => ({
        ...prev,
        name: parsed.vaccine_name || parsed.title || prev.name,
        brand: parsed.vaccine_brand || prev.brand,
        active_ingredient: parsed.composition || prev.active_ingredient,
      }))
    }

    setShowScanner(false)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    setAddSuccess(false);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Oturum bulunamadı.');

      const speciesEng = (species?.toLowerCase() === 'kedi' || species?.toLowerCase() === 'cat') ? 'cat' : 'dog';

      if (pickerType === 'vaccine') {
        const { error } = await supabase.from('vaccine_brands').insert({
          vaccine_code: 'CUSTOM',
          species: speciesEng,
          brand_name: addForm.brand + (addForm.name ? ' - ' + addForm.name : ''),
          manufacturer: addForm.brand,
          description: addForm.active_ingredient,
          is_core: false,
          is_active: false,
          status: 'pending',
          suggested_by: user.id
        });
        if (error) throw error;
      } else {
        let durationDays = parseInt(addForm.duration, 10);
        if (isNaN(durationDays) || durationDays <= 0) {
          durationDays = 0;
        } else {
          switch (addDurationUnit) {
            case 'hour':
              durationDays = Number((durationDays / 24).toFixed(4));
              break;
            case 'week':
              durationDays = durationDays * 7;
              break;
            case 'month':
              durationDays = durationDays * 30;
              break;
            case 'year':
              durationDays = durationDays * 365;
              break;
            case 'day':
            default:
              break;
          }
        }

        const { error } = await supabase.from('parasite_products').insert({
          species: speciesEng,
          name: addForm.name,
          brand: addForm.brand,
          type: addForm.type,
          application_method: addForm.method,
          active_ingredient: addForm.active_ingredient,
          protection_duration_days: durationDays,
          is_active: false,
          status: 'pending',
          suggested_by: user.id
        });
        if (error) throw error;
      }

      setAddSuccess(true);
      setTimeout(() => {
        setShowAddForm(false);
        setAddSuccess(false);
        setAddForm({ brand: '', name: '', type: 'internal', method: 'oral', active_ingredient: '', duration: '' });
        setAddDurationUnit('day');
      }, 3000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setAddError(err.message);
      } else {
        setAddError('Bir hata oluştu.');
      }
    } finally {
      setAddLoading(false);
    }
  };

  // Aşıları ve ürünleri asenkron DB'den alıyoruz (Sistem şablonları + Kullanıcı önerileri)
  useEffect(() => {
    async function fetchData() {
      if (!species) {
        setDbProducts([]);
        return;
      }
      setLoading(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const speciesTr = (species.toLowerCase() === 'cat' || species.toLowerCase() === 'kedi') ? 'Kedi' : 'Köpek';
        const speciesEng = speciesTr === 'Kedi' ? 'cat' : 'dog';
        
        // 1. Sistem Şablonlarını Getir (vaccine_protocols — vaccine_templates dropped edildi)
        // Not: vaccine_protocols yalnızca aşı protokollerini tutar; parazit ürünleri
        // ayrı parasite_products tablosundan (aşağıda) geliyor.
        let templateOptions: VaccineOption[] = [];
        if (pickerType === 'vaccine') {
          const { data: protocols } = await supabase
            .from('vaccine_protocols')
            .select('*')
            .eq('species', speciesEng)
            .eq('is_active', true);

          if (protocols) {
            templateOptions = protocols.map((p: any) => ({
              code: p.vaccine_code,
              name: p.protocol_name,
              nameTr: p.protocol_name,
              species: speciesEng,
              group: (p.is_core ? 'core' : 'optional') as 'core' | 'optional',
              isParasite: false,
              protection_duration_days: p.repeat_interval_days || undefined,
              isTemplate: true,
            }));
          }
        }

        // 2. Kullanıcı Önerilerini/Markaları Getir
        let customOptions: VaccineOption[] = [];
        if (pickerType === 'vaccine') {
           const { data: brands } = await supabase
             .from('vaccine_brands')
             .select('*')
             .or(`species.eq.both,species.eq.${speciesEng}`)
             .eq('is_active', true)
             .eq('status', 'approved');
           
           if (brands) {
             customOptions = brands.map((d: any) => ({
              code: String(d.vaccine_code),
              name: String(d.brand_name),
              nameTr: String(d.manufacturer),
              group: (d.is_core ? 'core' : 'optional') as 'core' | 'optional',
              species: speciesEng,
              image_url: d.image_url ? String(d.image_url) : undefined,
              description: d.description ? String(d.description) : undefined,
              brand: String(d.manufacturer),
              brandId: String(d.id),
              isParasite: false,
             }));
           }
        } else if (pickerType === 'parasite') {
            let typeFilter: string[] = ['internal', 'external', 'combined', 'collar'];
            if (subCategory === 'İç Parazit') typeFilter = ['internal', 'combined'];
            if (subCategory === 'Dış Parazit') typeFilter = ['external', 'combined'];
            if (subCategory === 'Birleşik Parazit') typeFilter = ['combined'];
            if (subCategory === 'Parazit Tasması') typeFilter = ['collar'];

           const { data: protocols } = await supabase
             .from('parasite_protocols')
             .select('*')
             .or(`species.eq.both,species.eq.${speciesEng}`)
             .eq('is_active', true)
             .in('parasite_type', typeFilter);
             
           if (protocols) {
             customOptions = protocols.map((d: any) => ({
              code: String(d.id),
              species: speciesEng,
              name: d.protocol_name,
              nameTr: `${d.parasite_code} (${d.default_application_method})`,
              group: 'optional' as 'core' | 'optional',
              isParasite: true,
              protection_duration_days: Number(d.default_protection_duration_days) || undefined,
              image_url: undefined,
              description: undefined,
              type: d.parasite_type ? String(d.parasite_type) : undefined,
              application_method: d.default_application_method ? String(d.default_application_method) : undefined,
              active_ingredient: d.parasite_code ? String(d.parasite_code) : undefined,
              brand: undefined
             }));
           }
        }

        setDbProducts([...templateOptions, ...customOptions]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [pickerType, species, subCategory]);

  // Auto-focus search after mount
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const itemsToFilter = dbProducts;

  const filtered = itemsToFilter.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.nameTr && v.nameTr.toLowerCase().includes(q)) ||
      v.code.toLowerCase().includes(q)
    );
  });

  // Group by core/optional
  const groups: { level: string; items: VaccineOption[] }[] = [
    { level: 'core', items: filtered.filter((v) => v.group === 'core') },
    { level: 'optional', items: filtered.filter((v) => v.group === 'optional') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="animate-fadeInUp mt-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-primary transition-colors shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
            {pickerType === 'vaccine' ? 'Aşı Seçin' : 'Ürün Seçin'}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {pickerType === 'vaccine'
              ? ((species?.toLowerCase() === 'dog' || species?.toLowerCase() === 'köpek') ? '🐶 Köpek aşıları' : (species?.toLowerCase() === 'cat' || species?.toLowerCase() === 'kedi') ? '🐱 Kedi aşıları' : 'Tüm aşılar')
              : 'Parazit Koruma Ürünleri'
            }
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={pickerType === 'vaccine' ? "Aşı adıyla ara..." : "Marka veya etken madde ara..."}
          className="input-base pl-9 text-[13px] py-2.5"
        />
      </div>

      {/* Product list */}
      {loading ? (
        <p className="text-center text-[13px] text-text-secondary py-4">Yükleniyor...</p>
      ) : groups.length === 0 ? (
        <p className="text-center text-[13px] text-text-secondary py-4">
          &quot;{searchQuery}&quot; ile eşleşen {pickerType === 'vaccine' ? 'aşı' : 'ürün'} yok.
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
          {groups.map(({ level, items }) => (
            <div key={level}>
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 px-1">
                {level === 'core' ? 'Temel' : 'Ek / Opsiyonel'}
              </p>
              <div className="flex flex-col gap-1.5">
                {items.map((vaccine) => (
                  <button
                    key={`${vaccine.code}-${vaccine.name}`}
                    type="button"
                    onClick={() => onSelect(vaccine)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border-main hover:border-primary/40 hover:bg-primary/5 transition-all text-left w-full"
                  >
                    {/* Left: Image or Initial */}
                    <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-primary/10 relative flex items-center justify-center">
                      {vaccine.image_url ? (
                        <Image src={vaccine.image_url} alt={vaccine.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-[18px]">
                          {(vaccine.brand || vaccine.name).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-bold text-text-primary truncate">
                            {vaccine.name}
                          </p>
                          {(vaccine as any).isTemplate && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded border border-blue-100">
                              Standart
                            </span>
                          )}
                        </div>
                        {vaccine.active_ingredient && (
                          <p className="text-[11px] text-text-secondary truncate">{vaccine.active_ingredient}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {vaccine.application_method && (
                          <span className="px-1.5 py-0.5 rounded border border-border-main text-[10px] text-text-secondary bg-white">
                            {vaccine.application_method}
                          </span>
                        )}
                        {vaccine.protection_duration_days ? (
                          <span className="px-1.5 py-0.5 rounded border border-border-main text-[10px] text-text-secondary bg-white">
                            {vaccine.protection_duration_days} gün koruma
                          </span>
                        ) : null}
                      </div>

                      {vaccine.description && (
                        <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">
                          {vaccine.description}
                        </p>
                      )}

                      {/* Card Bottom: Type Badge */}
                      {vaccine.type && (
                        <div className="mt-1">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block
                            ${vaccine.type === 'internal' ? 'bg-blue-50 text-blue-600' : 
                              vaccine.type === 'external' ? 'bg-green-50 text-green-600' : 
                              vaccine.type === 'collar' ? 'bg-indigo-50 text-indigo-600' :
                              'bg-purple-50 text-purple-600'}
                          `}>
                            {vaccine.type === 'internal' ? 'İç Parazit' : 
                             vaccine.type === 'external' ? 'Dış Parazit' : 
                             vaccine.type === 'collar' ? 'Parazit Tasması' : 
                             'İç + Dış Parazit'}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Marka Ekle — her picker tipinde göster */}
      {!showAddForm && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="mt-2 w-full py-2.5 text-[13px] font-bold text-primary border border-dashed border-primary/40 rounded-xl hover:bg-primary/5 transition-all"
        >
          + Listede Yok? Yeni Marka Ekle
        </button>
      )}

      {/* Öneri formu */}
      {showAddForm && (
        <div className="flex flex-col gap-3 p-4 bg-bg-main rounded-2xl border border-border-main mt-2">
          {!showScanner && (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-[13px] font-bold text-primary bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-all mb-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Ambalajı Tara — Otomatik Doldur
            </button>
          )}

          {showScanner && (
            <SmartScanner
              petId={undefined}
              onClose={() => setShowScanner(false)}
              onResult={handleScanResult}
            />
          )}

          <p className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Yeni Ürün Öner</p>
          {pickerType === 'parasite' && (
            <p className="text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
              ⚠️ Parazit ürünü önerme özelliği şu anda aktif değil. Bu formu şimdilik gönderemezsiniz, ürün önerinizi destek ekibimizle paylaşabilirsiniz.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Marka Adı *</label>
              <input type="text" className="input-base text-[13px] py-2"
                value={addForm.brand} onChange={e => setAddForm({...addForm, brand: e.target.value})}
                placeholder="Örn: Zoetis" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Ürün Adı *</label>
              <input type="text" className="input-base text-[13px] py-2"
                value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})}
                placeholder="Örn: Simparica" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Tip *</label>
              <select className="input-base text-[13px] py-2" value={addForm.type}
                onChange={e => setAddForm({...addForm, type: e.target.value})}>
                <option value="internal">İç Parazit</option>
                <option value="external">Dış Parazit</option>
                <option value="combined">İkisi de</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Uygulama *</label>
              <select className="input-base text-[13px] py-2" value={addForm.method}
                onChange={e => setAddForm({...addForm, method: e.target.value})}>
                <option value="oral">Oral</option>
                <option value="spot-on">Spot-on</option>
                <option value="collar">Tasma</option>
                <option value="spray">Sprey</option>
                <option value="injection">Enjeksiyon</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Etken Madde</label>
              <input type="text" className="input-base text-[13px] py-2"
                value={addForm.active_ingredient} onChange={e => setAddForm({...addForm, active_ingredient: e.target.value})}
                placeholder="Opsiyonel" />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[11px] font-bold text-text-secondary">Koruma Süresi *</label>
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="number" 
                  className="w-20 input-base text-[13px] py-2" 
                  min="0"
                  value={addForm.duration} 
                  onChange={e => setAddForm({...addForm, duration: e.target.value})}
                  placeholder="Örn: 3" 
                />
                
                <div className="flex items-center bg-bg-main p-1 rounded-xl border border-border-main grow justify-between">
                  {(['hour', 'day', 'week', 'month', 'year'] as const).map((u) => {
                    const labels: Record<string, string> = {
                      hour: 'Saat',
                      day: 'Gün',
                      week: 'Hft',
                      month: 'Ay',
                      year: 'Yıl'
                    };
                    const isActive = addDurationUnit === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setAddDurationUnit(u)}
                        className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                          isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:bg-border-main/50'
                        }`}
                      >
                        {labels[u]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {parseInt(addForm.duration, 10) > 0 && (
                <span className="text-[11px] text-text-muted mt-1 block">
                  Veritabanına {
                    addDurationUnit === 'hour' ? `${(parseInt(addForm.duration, 10) / 24).toFixed(4)} gün` :
                    addDurationUnit === 'week' ? `${parseInt(addForm.duration, 10) * 7} gün` :
                    addDurationUnit === 'month' ? `${parseInt(addForm.duration, 10) * 30} gün` :
                    addDurationUnit === 'year' ? `${parseInt(addForm.duration, 10) * 365} gün` :
                    `${parseInt(addForm.duration, 10)} gün`
                  } koruma olarak kaydedilecektir.
                </span>
              )}
            </div>
          </div>
          {addError && (
            <p className="text-[12px] font-bold text-red-600 bg-red-50 p-2 rounded-xl">
              {addError}
            </p>
          )}
          {addSuccess && (
            <p className="text-[12px] font-bold text-green-600 bg-green-50 p-2 rounded-xl">
              ✓ Öneriniz incelemeye alındı. Onaylandıktan sonra listede görünecek.
            </p>
          )}
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => { setShowAddForm(false); setAddSuccess(false); setAddError(''); }}
              className="flex-1 py-2 text-[13px] font-bold text-text-secondary border border-border-main rounded-xl hover:bg-bg-main transition-all">
              Vazgeç
            </button>
            <button type="button" onClick={handleAddSubmit} disabled={addLoading || pickerType === 'parasite'}
              className="flex-1 py-2 text-[13px] font-bold text-white bg-primary rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50">
              {addLoading ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

