'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProductSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState<'Kedi' | 'Köpek' | 'Tümü'>('Tümü');
  const [categoryFilter, setCategoryFilter] = useState<'parasite_external' | 'parasite_internal' | 'parasite_collar' | 'food' | 'supplement' | 'all'>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [durationVal, setDurationVal] = useState<number>(0);
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day' | 'week' | 'month' | 'year'>('day');

  useEffect(() => {
    if (wizardOpen) {
      const days = editingTemplate?.duration_days;
      if (days == null || isNaN(days) || days <= 0) {
        setDurationVal(0);
        setDurationUnit('day');
      } else if (days % 365 === 0) {
        setDurationVal(days / 365);
        setDurationUnit('year');
      } else if (days % 30 === 0) {
        setDurationVal(days / 30);
        setDurationUnit('month');
      } else if (days % 7 === 0) {
        setDurationVal(days / 7);
        setDurationUnit('week');
      } else {
        const hours = days * 24;
        if (hours < 24 && Number.isInteger(hours)) {
          setDurationVal(hours);
          setDurationUnit('hour');
        } else {
          setDurationVal(days);
          setDurationUnit('day');
        }
      }
    }
  }, [wizardOpen, editingTemplate]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products/templates');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (wizardOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [wizardOpen]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/products/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (template: any) => {
    try {
      await fetch(`/api/products/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active })
      });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTemplates = templates.filter(t => {
    let matchSpecies = true;
    if (speciesFilter === 'Kedi') matchSpecies = t.species === 'cat' || t.species === 'both';
    if (speciesFilter === 'Köpek') matchSpecies = t.species === 'dog' || t.species === 'both';
    
    let matchCategory = true;
    if (categoryFilter !== 'all') matchCategory = t.category === categoryFilter;

    return matchSpecies && matchCategory;
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'parasite_external': return 'Dış Parazit';
      case 'parasite_internal': return 'İç Parazit';
      case 'parasite_collar': return 'Tasma';
      case 'food': return 'Mama';
      case 'supplement': return 'Takviye';
      default: return category;
    }
  };

  const renderTemplateCard = (template: any) => (
    <div key={template.id} className="card-base p-4 flex flex-col gap-3 border-l-4" style={{ borderColor: template.is_active ? '#2ca67a' : '#d1d5db' }}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-text-primary">{template.brand_name} {template.product_name || ''}</h3>
            {!template.is_active && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-sm uppercase tracking-widest">Pasif</span>}
          </div>
          <div className="flex gap-2 mt-1.5">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded uppercase">{getCategoryLabel(template.category)}</span>
            <span className="px-2 py-0.5 bg-border-main/50 text-text-secondary text-[11px] font-bold rounded uppercase">
              {template.species === 'both' ? 'Tümü' : (template.species === 'cat' ? 'Kedi' : 'Köpek')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditingTemplate(template); setWizardOpen(true); }} className="p-2 text-text-secondary hover:text-primary transition-colors bg-bg-main rounded-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => handleDelete(template.id)} className="p-2 text-text-secondary hover:text-error transition-colors bg-bg-main rounded-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
      {template.duration_days && (
        <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{template.duration_days} Gün Etkili</span>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border-main/50 pt-3 mt-1">
        <span className="text-[12px] font-bold text-text-secondary">Sistemde Aktif</span>
        <button 
          onClick={() => handleToggleActive(template)}
          className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${template.is_active ? 'bg-primary' : 'bg-border-main'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-sm ${template.is_active ? 'left-[26px]' : 'left-[2px]'}`} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto font-sans">
      <div className="flex items-center justify-between px-2 -mb-2 mt-2">
        <Link href="/owner/profile" className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors text-[14px] font-bold group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Geri Dön
        </Link>
        <button 
          onClick={() => { setEditingTemplate(null); setWizardOpen(true); }}
          className="bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors text-[13px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yeni Ekle
        </button>
      </div>

      <div className="px-2">
        <h1 className="text-[24px] font-black text-text-primary tracking-tight">Ürün Şablonları</h1>
        <p className="text-[14px] text-text-secondary mt-1 leading-relaxed">
          Sistem genelinde kullanılacak olan parazit, mama ve takviye şablonlarını buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="flex flex-col gap-3 mx-2">
        {/* Tür Seçimi */}
        <div className="flex bg-border-main/30 p-1 rounded-2xl">
          <button 
            className={`flex-1 py-2.5 text-[14px] font-bold rounded-xl transition-all ${speciesFilter === 'Tümü' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary'}`}
            onClick={() => setSpeciesFilter('Tümü')}
          >
            Tümü
          </button>
          <button 
            className={`flex-1 py-2.5 text-[14px] font-bold rounded-xl transition-all ${speciesFilter === 'Kedi' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary'}`}
            onClick={() => setSpeciesFilter('Kedi')}
          >
            🐱 Kediler
          </button>
          <button 
            className={`flex-1 py-2.5 text-[14px] font-bold rounded-xl transition-all ${speciesFilter === 'Köpek' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary'}`}
            onClick={() => setSpeciesFilter('Köpek')}
          >
            🐶 Köpekler
          </button>
        </div>

        {/* Kategori Filtresi */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'parasite_external', label: 'Dış Parazit' },
            { id: 'parasite_internal', label: 'İç Parazit' },
            { id: 'parasite_collar', label: 'Tasma' },
            { id: 'food', label: 'Mama' },
            { id: 'supplement', label: 'Takviye' }
          ].map(cat => (
            <button 
              key={cat.id}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all border ${categoryFilter === cat.id ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-secondary border-border-main'}`}
              onClick={() => setCategoryFilter(cat.id as any)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="w-8 h-8 rounded-full border-4 border-border-main border-t-primary animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-6 px-2">
          {filteredTemplates.length === 0 ? (
            <div className="card-base p-8 text-center text-text-secondary flex flex-col items-center gap-3">
              <span className="text-[32px]">📦</span>
              <p className="font-medium text-[14px]">Sistemde henüz bu filtreye uygun ürün bulunmuyor.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTemplates.map(renderTemplateCard)}
            </div>
          )}
        </div>
      )}

      {/* Floating Add Button */}
      <button 
        onClick={() => { setEditingTemplate(null); setWizardOpen(true); }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      {/* Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:w-[480px] max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300 p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-[20px] font-black text-text-primary tracking-tight">{editingTemplate ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2>
              <button onClick={() => setWizardOpen(false)} className="w-8 h-8 flex items-center justify-center bg-bg-main rounded-full text-text-secondary hover:text-text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
             <form className="flex flex-col gap-4" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              
              let finalDays: number | null = null;
              if (durationVal > 0) {
                switch (durationUnit) {
                  case 'hour':
                    finalDays = Number((durationVal / 24).toFixed(4));
                    break;
                  case 'week':
                    finalDays = durationVal * 7;
                    break;
                  case 'month':
                    finalDays = durationVal * 30;
                    break;
                  case 'year':
                    finalDays = durationVal * 365;
                    break;
                  case 'day':
                  default:
                    finalDays = durationVal;
                    break;
                }
              }

              const payload = {
                category: fd.get('category'),
                brand_name: fd.get('brand_name'),
                product_name: fd.get('product_name') || null,
                species: fd.get('species'),
                duration_days: finalDays,
                is_active: fd.get('is_active') === 'on',
              };
              try {
                if (editingTemplate) {
                  await fetch(`/api/products/templates/${editingTemplate.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                } else {
                  await fetch('/api/products/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                }
                setWizardOpen(false);
                fetchTemplates();
              } catch (err) {
                console.error(err);
              }
            }}>
              <div>
                <label className="block text-[12px] font-bold text-text-secondary mb-1">Kategori</label>
                <select required name="category" defaultValue={editingTemplate?.category || 'parasite_external'} className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]">
                  <option value="parasite_external">Dış Parazit</option>
                  <option value="parasite_internal">İç Parazit</option>
                  <option value="parasite_collar">Parazit Tasması</option>
                  <option value="food">Mama</option>
                  <option value="supplement">Takviye / Vitamin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-text-secondary mb-1">Marka Adı</label>
                  <input required type="text" name="brand_name" defaultValue={editingTemplate?.brand_name} placeholder="Örn: Bravecto" className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-text-secondary mb-1">Ürün Adı (Opsiyonel)</label>
                  <input type="text" name="product_name" defaultValue={editingTemplate?.product_name || ''} placeholder="Örn: Plus" className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]" />
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-text-secondary mb-1">Tür</label>
                  <select name="species" defaultValue={editingTemplate?.species || 'both'} className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]">
                    <option value="both">Tümü</option>
                    <option value="cat">Sadece Kedi</option>
                    <option value="dog">Sadece Köpek</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[12px] font-bold text-text-secondary mb-1">Etki / Koruma Süresi</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="number"
                      min="0"
                      value={durationVal || ''}
                      onChange={(e) => setDurationVal(parseInt(e.target.value, 10) || 0)}
                      placeholder="Örn: 3"
                      className="w-20 px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]"
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
                        const isActive = durationUnit === u;
                        return (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setDurationUnit(u)}
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
                  {durationVal > 0 && (
                    <span className="text-[11px] text-text-muted mt-1 block">
                      Veritabanına {
                        durationUnit === 'hour' ? `${(durationVal / 24).toFixed(4)} gün` :
                        durationUnit === 'week' ? `${durationVal * 7} gün` :
                        durationUnit === 'month' ? `${durationVal * 30} gün` :
                        durationUnit === 'year' ? `${durationVal * 365} gün` :
                        `${durationVal} gün`
                      } olarak kaydedilecektir.
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-bg-main rounded-xl border border-border-main mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="is_active" defaultChecked={editingTemplate ? editingTemplate.is_active : true} className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" />
                  <span className="text-[13px] font-bold text-text-primary">Aktif</span>
                </label>
              </div>
              <button type="submit" className="w-full py-3.5 bg-primary hover:opacity-90 active:scale-[0.98] text-white font-bold rounded-xl mt-4 transition-all">
                {editingTemplate ? 'Güncelle' : 'Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
