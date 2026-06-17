'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VaccineSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState<'Kedi' | 'Köpek'>('Kedi');
  const [mandatoryFilter, setMandatoryFilter] = useState<'all' | 'core' | 'optional'>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vaccines/templates');
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
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/vaccines/templates?id=${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (template: any) => {
    try {
      await fetch('/api/vaccines/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, is_active: !template.is_active })
      });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchSpecies = t.species === (speciesFilter === 'Kedi' ? 'cat' : 'dog');
    const matchMandatory = mandatoryFilter === 'all' ? true : (mandatoryFilter === 'core' ? (t.mandatory_level === 'core' || t.mandatory_level === 'mandatory') : t.mandatory_level === 'optional');
    return matchSpecies && matchMandatory;
  });

  const vaccines = filteredTemplates.filter(t => t.category === 'vaccine');
  const parasites = filteredTemplates.filter(t => t.category === 'parasite');

  const renderTemplateCard = (template: any) => (
    <div key={template.id} className="card-base p-4 flex flex-col gap-3 border-l-4" style={{ borderColor: template.is_active ? '#2ca67a' : '#d1d5db' }}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-text-primary">{template.vaccine_name}</h3>
            {!template.is_active && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-sm uppercase tracking-widest">Pasif</span>}
          </div>
          <p className="text-[12px] text-text-secondary font-medium mt-0.5">
            {template.vaccine_code} • {template.mandatory_level === 'core' || template.mandatory_level === 'mandatory' ? 'Zorunlu' : 'Opsiyonel'}
          </p>
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
      <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">İlk: {template.first_dose_week}. Hafta</span>
        <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">Doz: {template.dose_count}</span>
        {template.recurrence_days && <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">Tekrar: {template.recurrence_days} gün</span>}
        {template.has_annual_booster && <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700">Yıllık Tekrar: Var</span>}
      </div>
      <div className="flex items-center justify-between border-t border-border-main/50 pt-3 mt-1">
        <span className="text-[12px] font-bold text-text-secondary">Modülde Görünüm</span>
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
        <h1 className="text-[24px] font-black text-text-primary tracking-tight">Zorunlu Aşı Şablonları</h1>
        <p className="text-[14px] text-text-secondary mt-1 leading-relaxed">
          Sistem genelinde kullanılacak olan standart kedi ve köpek aşılarını, tekrar sürelerini ve zorunluluk durumlarını buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="flex flex-col gap-3 mx-2">
        {/* Tür Seçimi */}
        <div className="flex bg-border-main/30 p-1 rounded-2xl">
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

        {/* Zorunluluk Filtresi */}
        <div className="flex gap-2">
          <button 
            className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all border ${mandatoryFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-secondary border-border-main'}`}
            onClick={() => setMandatoryFilter('all')}
          >
            Tümü
          </button>
          <button 
            className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all border ${mandatoryFilter === 'core' ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-secondary border-border-main'}`}
            onClick={() => setMandatoryFilter('core')}
          >
            Sadece Zorunlu
          </button>
          <button 
            className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all border ${mandatoryFilter === 'optional' ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-secondary border-border-main'}`}
            onClick={() => setMandatoryFilter('optional')}
          >
            Opsiyonel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="w-8 h-8 rounded-full border-4 border-border-main border-t-primary animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-6 px-2">
          {filteredTemplates.length === 0 ? (
            <div className="card-base p-8 text-center text-text-secondary flex flex-col items-center gap-3">
              <span className="text-[32px]">💉</span>
              <p className="font-medium text-[14px]">Sistemde henüz bu tür için şablon bulunmuyor.</p>
            </div>
          ) : (
            <>
              {vaccines.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-[18px] font-black text-text-primary px-1">Aşılar</h2>
                  {vaccines.map(renderTemplateCard)}
                </div>
              )}
              {parasites.length > 0 && (
                <div className="flex flex-col gap-3 mt-2">
                  <h2 className="text-[18px] font-black text-text-primary px-1">Parazit Uygulamaları</h2>
                  {parasites.map(renderTemplateCard)}
                </div>
              )}
            </>
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

      {/* Wizard Modal (Simplified inline for demo) */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:w-[480px] max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300 p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-[20px] font-black text-text-primary tracking-tight">{editingTemplate ? 'Şablonu Düzenle' : 'Yeni Aşı Şablonu'}</h2>
              <button onClick={() => setWizardOpen(false)} className="w-8 h-8 flex items-center justify-center bg-bg-main rounded-full text-text-secondary hover:text-text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form className="flex flex-col gap-4" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const payload = {
                vaccine_name: fd.get('vaccine_name'),
                vaccine_code: fd.get('vaccine_code'),
                species: fd.get('species'),
                category: fd.get('category'),
                mandatory_level: fd.get('mandatory_level'),
                first_dose_week: Number(fd.get('first_dose_week')),
                dose_count: Number(fd.get('dose_count')),
                recurrence_days: Number(fd.get('recurrence_days')) || null,
                has_annual_booster: fd.get('has_annual_booster') === 'on',
                is_active: fd.get('is_active') === 'on',
              };
              try {
                if (editingTemplate) {
                  await fetch('/api/vaccines/templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTemplate.id, ...payload }) });
                } else {
                  await fetch('/api/vaccines/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                }
                setWizardOpen(false);
                fetchTemplates();
              } catch (err) {
                console.error(err);
              }
            }}>
              <div>
                <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">Aşı/Parazit Adı</label>
                <input required name="vaccine_name" defaultValue={editingTemplate?.vaccine_name} className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" placeholder="Örn: Kuduz Aşısı" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">Kodu</label>
                  <input required name="vaccine_code" defaultValue={editingTemplate?.vaccine_code} className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-all" placeholder="Örn: RABIES" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">Tür</label>
                  <select name="species" defaultValue={editingTemplate?.species || (speciesFilter === 'Kedi' ? 'cat' : 'dog')} className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-all">
                    <option value="cat">Kedi</option>
                    <option value="dog">Köpek</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">Kategori</label>
                  <select name="category" defaultValue={editingTemplate?.category || 'vaccine'} className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-all">
                    <option value="vaccine">Aşı</option>
                    <option value="parasite">Parazit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">Zorunluluk</label>
                  <select name="mandatory_level" defaultValue={editingTemplate?.mandatory_level || 'core'} className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-all">
                    <option value="core">Zorunlu</option>
                    <option value="optional">Opsiyonel</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">İlk Doz (Hafta)</label>
                  <input type="number" required name="first_dose_week" defaultValue={editingTemplate?.first_dose_week ?? 8} className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">Toplam Doz</label>
                  <input type="number" required name="dose_count" defaultValue={editingTemplate?.dose_count ?? 1} className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-text-secondary mb-1.5 block">Tekrar (Gün)</label>
                  <input type="number" name="recurrence_days" defaultValue={editingTemplate?.recurrence_days || ''} placeholder="Örn: 30" className="w-full bg-bg-main border border-border-main rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-all" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-bg-main rounded-xl border border-border-main mt-2">
                <div>
                  <h4 className="text-[14px] font-bold text-text-primary">Yıllık Tekrar</h4>
                  <p className="text-[11px] text-text-secondary font-medium">Bu aşı her yıl tekrarlanır mı?</p>
                </div>
                <input type="checkbox" name="has_annual_booster" defaultChecked={editingTemplate?.has_annual_booster} className="w-5 h-5 accent-primary" />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-bg-main rounded-xl border border-border-main mb-2">
                <div>
                  <h4 className="text-[14px] font-bold text-text-primary">Aktiflik Durumu</h4>
                  <p className="text-[11px] text-text-secondary font-medium">Kullanıcıların listelerinde görünsün mü?</p>
                </div>
                <input type="checkbox" name="is_active" defaultChecked={editingTemplate ? editingTemplate.is_active : true} className="w-5 h-5 accent-primary" />
              </div>

              <button type="submit" className="w-full btn-primary py-3.5 text-[15px]">
                {editingTemplate ? 'Değişiklikleri Kaydet' : 'Şablonu Oluştur'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
