'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SymptomSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState<'Kedi' | 'Köpek' | 'Tümü'>('Tümü');
  const [criticalFilter, setCriticalFilter] = useState<'all' | 'critical' | 'normal'>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/symptoms/templates');
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
    if (!confirm('Bu semptomu silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/symptoms/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (template: any) => {
    try {
      await fetch(`/api/symptoms/templates/${template.id}`, {
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
    
    let matchCritical = true;
    if (criticalFilter === 'critical') matchCritical = t.is_critical === true;
    if (criticalFilter === 'normal') matchCritical = t.is_critical === false || t.is_critical === null;

    return matchSpecies && matchCritical;
  });

  const renderTemplateCard = (template: any) => (
    <div key={template.id} className="card-base p-4 flex flex-col gap-3 border-l-4" style={{ borderColor: template.is_active ? '#2ca67a' : '#d1d5db' }}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-text-primary">{template.name_tr}</h3>
            {template.is_critical && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-sm uppercase tracking-widest">Kritik</span>}
            {!template.is_active && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-sm uppercase tracking-widest">Pasif</span>}
          </div>
          <p className="text-[12px] text-text-secondary font-medium mt-0.5">
            {template.name} • {template.species === 'both' ? 'Tümü' : (template.species === 'cat' ? 'Kedi' : 'Köpek')}
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
      {template.body_system && (
        <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{template.body_system}</span>
        </div>
      )}
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
        <h1 className="text-[24px] font-black text-text-primary tracking-tight">Semptom Şablonları</h1>
        <p className="text-[14px] text-text-secondary mt-1 leading-relaxed">
          Sistem genelinde kullanılacak olan standart semptomları, türlerini ve kritiklik durumlarını buradan yönetebilirsiniz.
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

        {/* Kritiklik Filtresi */}
        <div className="flex gap-2">
          <button 
            className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all border ${criticalFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-secondary border-border-main'}`}
            onClick={() => setCriticalFilter('all')}
          >
            Tümü
          </button>
          <button 
            className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all border ${criticalFilter === 'critical' ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-text-secondary border-border-main'}`}
            onClick={() => setCriticalFilter('critical')}
          >
            Kritik
          </button>
          <button 
            className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all border ${criticalFilter === 'normal' ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-secondary border-border-main'}`}
            onClick={() => setCriticalFilter('normal')}
          >
            Normal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><div className="w-8 h-8 rounded-full border-4 border-border-main border-t-primary animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-6 px-2">
          {filteredTemplates.length === 0 ? (
            <div className="card-base p-8 text-center text-text-secondary flex flex-col items-center gap-3">
              <span className="text-[32px]">🩺</span>
              <p className="font-medium text-[14px]">Sistemde henüz bu filtreye uygun semptom bulunmuyor.</p>
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
              <h2 className="text-[20px] font-black text-text-primary tracking-tight">{editingTemplate ? 'Şablonu Düzenle' : 'Yeni Semptom'}</h2>
              <button onClick={() => setWizardOpen(false)} className="w-8 h-8 flex items-center justify-center bg-bg-main rounded-full text-text-secondary hover:text-text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <form className="flex flex-col gap-4" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const payload = {
                name: fd.get('name'),
                name_tr: fd.get('name_tr'),
                species: fd.get('species'),
                body_system: fd.get('body_system'),
                is_critical: fd.get('is_critical') === 'on',
                is_active: fd.get('is_active') === 'on',
              };
              try {
                if (editingTemplate) {
                  await fetch(`/api/symptoms/templates/${editingTemplate.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                } else {
                  await fetch('/api/symptoms/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                }
                setWizardOpen(false);
                fetchTemplates();
              } catch (err) {
                console.error(err);
              }
            }}>
              <div>
                <label className="block text-[12px] font-bold text-text-secondary mb-1">Semptom Adı (TR)</label>
                <input required type="text" name="name_tr" defaultValue={editingTemplate?.name_tr} className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-text-secondary mb-1">Semptom Adı (EN/Kod)</label>
                <input required type="text" name="name" defaultValue={editingTemplate?.name} className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-text-secondary mb-1">Tür</label>
                  <select name="species" defaultValue={editingTemplate?.species || 'both'} className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]">
                    <option value="both">Tümü</option>
                    <option value="cat">Sadece Kedi</option>
                    <option value="dog">Sadece Köpek</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-text-secondary mb-1">Vücut Sistemi</label>
                  <input type="text" name="body_system" defaultValue={editingTemplate?.body_system} placeholder="Örn: Sindirim" className="w-full px-3 py-2.5 bg-bg-main border border-border-main rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[14px]" />
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-bg-main rounded-xl border border-border-main mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="is_critical" defaultChecked={editingTemplate?.is_critical} className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-gray-300" />
                  <span className="text-[13px] font-bold text-text-primary">Kritik Semptom</span>
                </label>
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
