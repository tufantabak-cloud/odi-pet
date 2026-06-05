'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getVaccineCatalog, VaccineCatalogItem } from '@/lib/tasks/vaccineCatalog';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { SmartScanner } from '@/components/ui/SmartScanner';

export type VaccineOption = VaccineCatalogItem & {
  isParasite?: boolean;
  protection_duration_days?: number;
  image_url?: string;
  description?: string;
  type?: string;
  application_method?: string;
  active_ingredient?: string;
  brand?: string;
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
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');

  const handleScanResult = (result: any) => {
    const parsed = result?.parsed || result
    if (!parsed) return

    // Parazit ambalajı için
    if (parsed.title || parsed.brand || parsed.parasite_type) {
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
        const { error } = await supabase.from('parasite_products').insert({
          species: speciesEng,
          name: addForm.name,
          brand: addForm.brand,
          type: addForm.type,
          application_method: addForm.method,
          active_ingredient: addForm.active_ingredient,
          protection_duration_days: parseInt(addForm.duration, 10),
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
      }, 3000);

    } catch (err: any) {
      setAddError(err.message || 'Bir hata oluştu.');
    } finally {
      setAddLoading(false);
    }
  };

  // Aşıları statik dosyadan alıyoruz
  const vaccines = useMemo(() => getVaccineCatalog(species), [species]);

  // Parazit ürünlerini asenkron DB'den alıyoruz
  useEffect(() => {
    if (pickerType === 'parasite' && species) {
      setLoading(true);
      const supabase = createBrowserSupabaseClient();
      
      let typeFilter: string[] = ['internal', 'external', 'combined'];
      if (subCategory === 'İç Parazit') typeFilter = ['internal', 'combined'];
      if (subCategory === 'Dış Parazit' || subCategory === 'Parazit Tasması') typeFilter = ['external', 'combined'];

      const speciesEng = (species?.toLowerCase() === 'kedi' || species?.toLowerCase() === 'cat') 
        ? 'cat' 
        : 'dog'

      supabase
        .from('parasite_products')
        .select('*')
        .or(`species.eq.both,species.eq.${speciesEng}`)
        .eq('is_active', true)
        .in('type', typeFilter)
        .then(({ data, error }) => {
          if (!error && data) {
            const mapped = data.map((d: any) => ({
              code: d.id,
              name: `${d.brand} - ${d.name}`,
              nameTr: `${d.active_ingredient} (${d.application_method})`,
              group: 'core', // Varsayılan olarak temel gösterelim
              isParasite: true,
              protection_duration_days: d.protection_duration_days,
              image_url: d.image_url,
              description: d.description,
              type: d.type,
              application_method: d.application_method,
              active_ingredient: d.active_ingredient,
              brand: d.brand
            }));
            setDbProducts(mapped);
          }
          setLoading(false);
        });
    } else if (pickerType === 'vaccine' && species) {
      setLoading(true);
      const supabase = createBrowserSupabaseClient();
      const speciesEng = (species?.toLowerCase() === 'kedi' || species?.toLowerCase() === 'cat') ? 'cat' : 'dog';
      supabase
        .from('vaccine_brands')
        .select('*')
        .or(`species.eq.both,species.eq.${speciesEng}`)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('is_core', { ascending: false })
        .order('brand_name')
        .then(({ data, error }) => {
          if (!error && data) {
            const mapped = data.map((d: any) => ({
              code: d.vaccine_code,
              name: d.brand_name,
              nameTr: d.manufacturer,
              group: d.is_core ? 'core' : 'optional',
              species: d.species,
              image_url: d.image_url,
              description: d.description,
              brand: d.manufacturer,
              isParasite: false,
            }));
            setDbProducts(mapped);
          }
          setLoading(false);
        });
    } else {
      setDbProducts([]);
    }
  }, [pickerType, species, subCategory]);

  // Auto-focus search after mount
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const itemsToFilter = dbProducts.length > 0 ? dbProducts : vaccines;

  const filtered = itemsToFilter.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.nameTr.toLowerCase().includes(q) ||
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
                    <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-primary/10 flex items-center justify-center">
                      {vaccine.image_url ? (
                        <img src={vaccine.image_url} alt={vaccine.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-[18px]">
                          {(vaccine.brand || vaccine.name).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div>
                        <p className="text-[14px] font-bold text-text-primary truncate">
                          {vaccine.name}
                        </p>
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
                            {vaccine.protection_duration_days} gün
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
                              'bg-purple-50 text-purple-600'}
                          `}>
                            {vaccine.type === 'internal' ? 'İç Parazit' : 
                             vaccine.type === 'external' ? 'Dış Parazit' : 
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
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-text-secondary">Koruma (Gün) *</label>
              <input type="number" className="input-base text-[13px] py-2" min="1"
                value={addForm.duration} onChange={e => setAddForm({...addForm, duration: e.target.value})}
                placeholder="Örn: 30" />
            </div>
          </div>
          {addSuccess && (
            <p className="text-[12px] font-bold text-green-600 bg-green-50 p-2 rounded-xl">
              ✓ Öneriniz incelemeye alındı. Onaylandıktan sonra listede görünecek.
            </p>
          )}
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => { setShowAddForm(false); setAddSuccess(false); }}
              className="flex-1 py-2 text-[13px] font-bold text-text-secondary border border-border-main rounded-xl hover:bg-bg-main transition-all">
              Vazgeç
            </button>
            <button type="button" onClick={handleAddSubmit} disabled={addLoading}
              className="flex-1 py-2 text-[13px] font-bold text-white bg-primary rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50">
              {addLoading ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

