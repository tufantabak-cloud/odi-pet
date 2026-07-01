'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { CategoryKey } from '@/lib/categoryThemes';
import { useWizardStore } from '@/store/wizardStore';
import { WizardShell } from '@/components/wizard/WizardShell';
import { WizardStep } from '@/components/wizard/WizardStep';
import { PetAvatar } from '@/components/ui/PetAvatar';
import { CheckCircle2, Search, ScanLine, Check } from 'lucide-react';
import { TaskCategory, getFilteredSubCategories, getSmartDefault } from '@/lib/tasks/taskDefaults';
import Image from 'next/image';
import Link from 'next/link';
import { SmartScanner } from '@/components/ui/SmartScanner';
import { normalizeSpecies } from '@/lib/species';

// ── Eşleştirmeler ──────────────────────────────────────────────────
const categoryMap: Record<string, TaskCategory> = {
  saglik: 'Saglik',
  asi: 'Medikal',
  parazit: 'Medikal',
  bakim: 'Bakım',
  beslenme: 'Beslenme',
  hijyen: 'Hijyen',
  aktivite: 'Aktiviteler'
};

const FREQ_LABEL: Record<string, string> = {
  daily: 'gün',
  weekly: 'hafta',
  monthly: 'ay',
  yearly: 'yıl',
};

const END_OPTIONS = [
  { value: 'never',       label: 'Sürekli',   icon: '∞' },
  { value: 'date',        label: 'Tarihe kadar', icon: '📅' },
  { value: 'occurrences', label: 'Tekrar sayısı', icon: '#' },
] as const;

export default function WizardOrchestrator() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const categoryKey = params.kategori as CategoryKey;
  
  const { stepIndex, wizardData, setStepData, setStepIndex, nextStep, prevStep, resetWizard } = useWizardStore();
  const [pets, setPets] = useState<any[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Vaccine/Parasite List State
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Parazit/Mama Products State
  const [products, setProducts] = useState<Array<{
    id: string
    brand_name: string
    product_name: string | null
    category: string
    duration_days: number | null
  }>>([])
  const [productsLoading, setProductsLoading] = useState(false)
  
  // Smart Scanner State
  const [showScanner, setShowScanner] = useState(false);

  // Symptoms State
  const [symptoms, setSymptoms] = useState<Array<{
    id: string;
    name_tr: string;
    is_critical: boolean;
  }>>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomsLoading, setSymptomsLoading] = useState(false);

  // Initialize
  useEffect(() => {
    resetWizard();
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    
    const fetchPetsAndPlan = async () => {
      const supabase = createBrowserSupabaseClient();
      
      let initialPlanData: any = null;
      if (editId) {
        const { data: planData } = await supabase.from('plans').select('*').eq('id', editId).single();
        if (planData) initialPlanData = planData;
      }

      const queryPetId = searchParams.get('pet_id');

      if (initialPlanData) {
        const scheduleDate = new Date(initialPlanData.scheduled_at);
        const dateStr = scheduleDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
        const timeStr = scheduleDate.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false });
        
        let endDateStr = null;
        if (initialPlanData.ends_at) {
          const ed = new Date(initialPlanData.ends_at);
          endDateStr = ed.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
        }

        const isDiğer = initialPlanData.sub_type === 'Diğer' || initialPlanData.sub_type === 'Genel';
        
        setStepData({
          pet_id: initialPlanData.pet_id,
          subCategory: isDiğer ? 'Diğer' : initialPlanData.sub_type,
          customText: isDiğer ? (initialPlanData.extra_data?.customText || initialPlanData.sub_type) : '',
          date: dateStr,
          time: timeStr,
          frequency: initialPlanData.repeat_rule || 'once',
          interval: initialPlanData.extra_data?.interval || 1,
          endCondition: initialPlanData.extra_data?.endCondition || 'never',
          endOccurrences: initialPlanData.extra_data?.endOccurrences || 1,
          endDate: endDateStr || '',
          notificationEnabled: initialPlanData.notif_before !== null && initialPlanData.notif_before >= 0,
          notificationMinutes: initialPlanData.notif_before || 0,
          notes: initialPlanData.note || '',
          metadata: initialPlanData.extra_data?.metadata || {},
          selectedVaccine: initialPlanData.extra_data?.vaccine || null,
          selectedProduct: initialPlanData.extra_data?.product || null,
          markAsDone: initialPlanData.extra_data?.is_past_done || false,
        });
        setIsEditMode(true);
        // Doğrudan Adım 2'ye geç (Pet seçimini atla)
        setStepIndex(1);
      } else {
        setStepData({
          pet_id: queryPetId || undefined,
          date: d.toISOString().split('T')[0],
          time: '12:00',
          frequency: 'once',
          interval: 1,
          endCondition: 'never',
          notificationMinutes: 0,
          notificationEnabled: true,
          metadata: {},
          notes: '',
          selectedProduct: null
        });
        if (queryPetId) {
          setStepIndex(1); // URL'de pet_id varsa pet seçim adımını atla
        }
      }

      const { data, error } = await supabase.from('pets').select('id, name, species, avatar_url');
      if (!error && data) {
        setPets(data.map((p: any) => ({ ...p, type: p.species })));
        if (data.length === 1 && !initialPlanData && !queryPetId) {
          setStepData({ pet_id: data[0].id });
        }
      }
      setLoadingPets(false);
      if (editId) setLoadingEdit(false);
    };
    fetchPetsAndPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey, editId]); // reset on category change

  const activePet = pets.find(p => p.id === (wizardData.pet_id || searchParams.get('pet_id')));
  const speciesStr = activePet?.type;

  // ── Smart Defaults Uygula (Alt Kategori Değişince) ────────────────
  useEffect(() => {
    const subCat = categoryKey === 'asi' ? 'Aşı' : wizardData.subCategory;
    if (subCat && subCat !== 'Diğer') {
      const defaults = getSmartDefault(subCat);
      setStepData({
        frequency: defaults.frequency,
        interval: defaults.interval,
        notificationMinutes: defaults.notification_minutes,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardData.subCategory, categoryKey]);

  // ── Fetch Vaccines / Products (Aşı veya Parazit ise) ────────────────
  useEffect(() => {
    const subCat = categoryKey === 'asi' ? 'Aşı' : wizardData.subCategory;
    const isVaccineOrParasite = subCat === 'Aşı' || subCat === 'İç Parazit' || subCat === 'Dış Parazit' || subCat === 'Parazit Tasması' || subCat === 'Birleşik Parazit';
    
    if (isVaccineOrParasite && speciesStr) {
      const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
          const supabase = createBrowserSupabaseClient();
          const speciesEng = normalizeSpecies(speciesStr);
          const isVaccine = subCat === 'Aşı';

          // 1. Templates
          const { data: templates } = await supabase.from('vaccine_templates')
            .select('*').eq('species', speciesEng).eq('is_active', true);
            
          let templateOptions: any[] = [];
          if (templates) {
            templateOptions = templates
              .filter((t: any) => {
                if (isVaccine) return t.category === 'vaccine';
                if (t.category !== 'parasite') return false;
                
                const c = String(t.vaccine_code).toUpperCase();
                if (subCat === 'İç Parazit' && c.includes('EXT')) return false;
                if ((subCat === 'Dış Parazit' || subCat === 'Parazit Tasması') && c.includes('INT')) return false;
                
                return true;
              })
              .map((t: any) => ({
                code: t.vaccine_code,
                name: t.vaccine_name,
                nameTr: t.vaccine_name,
                group: (t.mandatory_level === 'core' || t.mandatory_level === 'mandatory') ? 'core' : 'optional',
                isParasite: !isVaccine,
                protection_duration_days: t.recurrence_days,
                isTemplate: true,
              }));
          }

          // 2. Marka bilgileri artık kullanıcıdan manuel alınacak (Custom Brands kaldırıldı)
          setDbProducts(templateOptions);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingProducts(false);
        }
      };
      fetchProducts();
    }
  }, [wizardData.subCategory, categoryKey, speciesStr]);

  // ── Fetch Parazit / Mama Products ─────────────────────────────────
  useEffect(() => {
    if (categoryKey !== 'parazit') return;
    if (!wizardData.subCategory) return;

    setProductsLoading(true);
    
    const species = speciesStr ?? 'both';
    
    // Alt kategoriye göre category belirle
    const categoryMap: Record<string, string> = {
      'İç Parazit': 'parasite_internal',
      'Dış Parazit': 'parasite_external',
      'Parazit Tasması': 'parasite_collar',
      'Birleşik Parazit': 'parasite_external',
    };
    
    const category = categoryMap[wizardData.subCategory ?? ''] ?? 'parasite_external';

    fetch(`/api/products/templates?category=${category}&species=${species}`)
      .then(r => r.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .finally(() => setProductsLoading(false));
      
  }, [categoryKey, wizardData.subCategory, speciesStr]);

  // ── Fetch Symptoms (Belirti Takibi ise) ─────────────────────────────
  useEffect(() => {
    if (categoryKey !== 'saglik') return;
    if (wizardData.subCategory !== 'Belirti Takibi') return;
    
    setSymptomsLoading(true);
    const activePetLocal = pets.find(p => p.id === wizardData.pet_id);
    const species = activePetLocal?.species ?? 'both';
    
    fetch(`/api/symptoms/templates?species=${species}`)
      .then(r => r.json())
      .then(data => {
        setSymptoms(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setSymptomsLoading(false));
  }, [categoryKey, wizardData.subCategory, wizardData.pet_id, pets]);

  if (loadingPets || loadingEdit) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Yükleniyor...</div>;
  }

  const tc = categoryMap[categoryKey];
  if (!tc) {
    return <div className="min-h-screen bg-slate-50 p-6">Geçersiz Kategori.</div>;
  }

  // ── Adımları Hesapla ──────────────────────────────────────────────
  const needsPetSelection = pets.length > 1;
  const steps: any[] = [];
  
  if (needsPetSelection) {
    steps.push({ key: 'pet_id', type: 'pet_selection', title: 'Kimin için planlıyoruz?', desc: 'Evcil hayvan profilinizi seçin.' });
  }

  if (categoryKey !== 'asi') {
    steps.push({ key: 'subCategory', type: 'subcategory_selection', title: 'Alt Kategori', desc: 'Ne planlamak istiyorsunuz?' });
  }

  const subCat = categoryKey === 'asi' ? 'Aşı' : wizardData.subCategory;
  const isVaccineOrParasite = subCat === 'Aşı' || subCat === 'İç Parazit' || subCat === 'Dış Parazit' || subCat === 'Parazit Tasması' || subCat === 'Birleşik Parazit';
  
  if (isVaccineOrParasite) {
    const dynamicTitle = categoryKey === 'asi' ? 'Aşı Seçimi' : `${subCat} Seçimi`;
    steps.push({ key: 'selectedVaccine', type: 'vaccine_selection', title: dynamicTitle, desc: `${subCat} için uygulanan veya planlanan ürünü seçin.` });
  }

  const showMetadata = () => {
    if (subCat === 'Diğer') return true;
    if (subCat === 'Alerji') return true;
    if (!subCat && categoryKey !== 'asi') return false; // Alt kategori seçilmeden gösterme
    
    if (categoryKey === 'saglik') {
      const excluded = ['Kilo Takibi', 'İlaç'];
      return !excluded.includes(subCat);
    }
    if (categoryKey === 'beslenme') {
      const excluded = ['Su Tazeleme', 'Öğün'];
      return !excluded.includes(subCat);
    }
    return false;
  };

  if (showMetadata()) {
    steps.push({ key: 'metadata', type: 'metadata_selection', title: 'Detaylar', desc: 'Planla ilgili ekstra detaylar girin.' });
  }

  // Alerji kaydı için tarih-saat, tekrar ve bildirim adımlarını atlayalım, çünkü bu bir randevu/rutin değil geçmiş veya kalıcı durum kaydıdır.
  if (subCat !== 'Alerji') {
    steps.push({ key: 'datetime', type: 'datetime_selection', title: 'Tarih & Saat', desc: 'İşlem ne zaman gerçekleşecek?' });
    steps.push({ key: 'recurrence', type: 'recurrence_selection', title: 'Tekrar Sıklığı', desc: 'Bu plan tekrarlanacak mı?' });
    steps.push({ key: 'notification', type: 'notification_selection', title: 'Bildirim', desc: 'Hatırlatıcı ayarlarınızı tamamlayın.' });
  }

  const totalSteps = steps.length;
  // Use a clamped index in case we jump around
  const currentStepIndex = Math.min(stepIndex, totalSteps - 1);
  const currentStep = steps[currentStepIndex];

  // ── Next Butonu Validasyonu ───────────────────────────────────────
  let isNextDisabled = false;
  if (currentStep?.key === 'pet_id' && !wizardData.pet_id) isNextDisabled = true;
  if (currentStep?.key === 'subCategory' && !wizardData.subCategory) isNextDisabled = true;
  if (currentStep?.key === 'selectedVaccine' && !wizardData.selectedVaccine) isNextDisabled = true;
  if (currentStep?.key === 'datetime' && !wizardData.date) isNextDisabled = true;
  if (currentStep?.key === 'metadata' && subCat === 'Diğer' && !wizardData.customText?.trim()) isNextDisabled = true;
  if (currentStep?.key === 'metadata' && subCat === 'Alerji' && !wizardData.metadata?.trigger_name?.trim()) isNextDisabled = true;
  if (currentStep?.key === 'metadata' && subCat === 'Belirti Takibi' && selectedSymptoms.length === 0) isNextDisabled = true;
  if (currentStep?.key === 'recurrence' && wizardData.frequency !== 'once' && wizardData.endCondition === 'date' && !wizardData.endDate) isNextDisabled = true;

  const handleDelete = async () => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/plans/${editId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silme başarısız');
      router.push('/owner/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setIsDeleting(false);
    }
  };

  // ── API Payload Hazırlama ─────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const petId = wizardData.pet_id || (pets.length === 1 ? pets[0].id : null);

    if (subCat === 'Alerji') {
      try {
        const res = await fetch(`/api/pets/${petId}/allergies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger_name: wizardData.metadata?.trigger_name,
            symptoms: wizardData.metadata?.symptoms || null,
            treatment: wizardData.metadata?.treatment || null,
          }),
        });

        if (res.ok) {
          setIsSuccess(true);
        } else {
          const errData = await res.json();
          alert(`Hata: ${errData.error || 'Alerji kaydı eklenemedi'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Beklenmeyen bir hata oluştu.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    // Combine Date and Time
    let scheduledAt = wizardData.date;
    if (wizardData.time) {
      scheduledAt = `${wizardData.date}T${wizardData.time}:00`;
    } else {
      scheduledAt = `${wizardData.date}T12:00:00`;
    }
    
    let endsAt = null;
    if (wizardData.endCondition === 'date' && wizardData.endDate) {
      endsAt = `${wizardData.endDate}T23:59:59`;
    }

    const payload = {
      pet_id: petId,
      category: categoryKey,
      sub_type: subCat === 'Diğer' ? (wizardData.customText || 'Diğer') : (subCat || 'Genel'),
      scheduled_at: new Date(scheduledAt).toISOString(),
      repeat_rule: wizardData.frequency === 'once' ? null : wizardData.frequency,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      notif_before: wizardData.notificationEnabled ? (wizardData.notificationMinutes || 0) : 0,
      notif_unit: 'minute',
      note: wizardData.notes || null,
      extra_data: {
        interval: wizardData.interval,
        endCondition: wizardData.endCondition,
        endOccurrences: wizardData.endOccurrences,
        metadata: wizardData.metadata,
        vaccine: wizardData.selectedVaccine ? { code: wizardData.selectedVaccine.code ?? null, name: wizardData.selectedVaccine.name ?? null } : null,
        product: wizardData.selectedProduct ? {
          id: wizardData.selectedProduct.id,
          brand_name: wizardData.selectedProduct.brand_name ?? null,
          product_name: wizardData.selectedProduct.product_name ?? null,
          category: wizardData.selectedProduct.category ?? null,
          duration_days: wizardData.selectedProduct.duration_days ?? null
        } : null,
        is_past_done: !!wizardData.markAsDone
      },
    };

    try {
      const res = await fetch('/api/plans' + (editId ? `/${editId}` : ''), {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsSuccess(true);
      } else {
        const errData = await res.json();
        alert(`Hata: ${errData.error || 'Plan kaydedilemedi'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Beklenmeyen bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render Adımları ─────────────────────────────────────────────
  const renderStepContent = (step: any) => {
    
    if (step.type === 'pet_selection') {
      return (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
          {pets.map(pet => {
            const isSelected = wizardData.pet_id === pet.id;
            return (
              <button
                key={pet.id}
                onClick={() => {
                  setStepData({ pet_id: pet.id });
                  nextStep();
                }}
                className={`relative p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                  isSelected ? 'border-indigo-500 shadow-md bg-indigo-50/30 scale-[1.02]' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <PetAvatar photoUrl={pet.avatar_url} petType={pet.type} name={pet.name} size={64} />
                <span className={`font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{pet.name}</span>
              </button>
            )
          })}
        </div>
      );
    }

    if (step.type === 'subcategory_selection') {
      let subs = getFilteredSubCategories(tc, speciesStr);
      if (categoryKey === 'parazit') {
        subs = subs.filter(s => s.id.includes('Parazit'));
      }

      return (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
          {subs.map((sub) => {
            const isSelected = wizardData.subCategory === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setStepData({ subCategory: sub.id, selectedVaccine: null });
                  nextStep();
                }}
                className={`px-4 py-3 min-h-[50px] rounded-xl text-[13px] font-bold flex items-center transition-all border text-left ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (step.type === 'metadata_selection') {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {subCat === 'Diğer' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-text-primary">Görev Adı</label>
              <input
                type="text"
                value={wizardData.customText || ''}
                onChange={(e) => setStepData({ customText: e.target.value })}
                placeholder="Örn: Kuaför ziyareti..."
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}
          {subCat === 'Belirti Takibi' && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-text-secondary">
                Gözlemlenen belirtileri seçin
              </p>

              {symptomsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {symptoms
                    .filter(symptom => 
                      selectedSymptoms.length === 0 || 
                      selectedSymptoms.includes(symptom.id)
                    )
                    .map(symptom => {
                    const isSelected = selectedSymptoms.includes(symptom.id)
                    return (
                      <button
                        key={symptom.id}
                        onClick={() => {
                          const next = isSelected
                            ? selectedSymptoms.filter(id => id !== symptom.id)
                            : [...selectedSymptoms, symptom.id]
                          setSelectedSymptoms(next)
                          setStepData({
                            metadata: {
                              ...wizardData.metadata,
                              symptoms: next,
                              symptomNames: symptoms
                                .filter(s => next.includes(s.id))
                                .map(s => s.name_tr)
                            }
                          })
                        }}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                          isSelected
                            ? symptom.is_critical
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-primary text-white border-primary'
                            : symptom.is_critical
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-surface-1 text-text-secondary border-border-main'
                          }`}>
                        {symptom.is_critical && '⚠️ '}
                        {symptom.name_tr}
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedSymptoms.length > 0 && (
                <div className="mt-2 p-3 bg-surface-1 rounded-xl">
                  <p className="text-[11px] text-text-secondary mb-1">
                    Seçilen belirtiler:
                  </p>
                  <p className="text-[13px] text-text-primary font-medium">
                    {symptoms
                      .filter(s => selectedSymptoms.includes(s.id))
                      .map(s => s.name_tr)
                      .join(', ')}
                  </p>
                </div>
              )}

              {/* Serbest metin — ek not */}
              <textarea
                value={wizardData.metadata?.notes ?? ''}
                onChange={e => setStepData({
                  metadata: {
                    ...wizardData.metadata,
                    notes: e.target.value
                  }
                })}
                placeholder="Ek notlar (opsiyonel)..."
                rows={2}
                className="w-full p-3 rounded-xl border border-border-main text-[13px] resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />

              {/* AI Vet yönlendirme */}
              {selectedSymptoms.length > 0 && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center gap-3">
                  <span className="text-xl">🤖</span>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-primary">
                      AI Vet'e danışmak ister misin?
                    </p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Seçtiğin belirtileri analiz edelim
                    </p>
                  </div>
                  <Link
                    href={`/owner/ai-vet?symptoms=${
                      symptoms
                        .filter(s => selectedSymptoms.includes(s.id))
                        .map(s => s.name_tr)
                        .join(',')
                    }`}
                    className="text-[11px] text-primary font-bold underline underline-offset-2 flex-shrink-0">
                    Git →
                  </Link>
                </div>
              )}
            </div>
          )}
          {subCat === 'Alerji' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Alerjen / Tetikleyici Adı <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={wizardData.metadata?.trigger_name || ''}
                  onChange={(e) => setStepData({ metadata: { ...wizardData.metadata, trigger_name: e.target.value } })}
                  placeholder="Örn: Tavuk eti, polen, aşı vb."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-text-primary">Semptomlar / Belirtiler</label>
                <input
                  type="text"
                  value={wizardData.metadata?.symptoms || ''}
                  onChange={(e) => setStepData({ metadata: { ...wizardData.metadata, symptoms: e.target.value } })}
                  placeholder="Örn: Kaşıntı, döküntü, kusma..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-text-primary">Tedavi / Müdahale Yöntemi</label>
                <input
                  type="text"
                  value={wizardData.metadata?.treatment || ''}
                  onChange={(e) => setStepData({ metadata: { ...wizardData.metadata, treatment: e.target.value } })}
                  placeholder="Örn: Kortizon iğnesi, mama değişimi..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
            </>
          )}
          {categoryKey === 'saglik' && ['Tedavi/Pansuman', 'Tahlil/Rapor', 'Kronik Takip', 'İlaç'].includes(wizardData.subCategory || '') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-text-primary">Veteriner / Klinik Adı</label>
              <input
                type="text"
                value={wizardData.metadata?.professional_name || ''}
                onChange={(e) => setStepData({ metadata: { ...wizardData.metadata, professional_name: e.target.value } })}
                placeholder="Örn: Dr. Ali Yılmaz veya Vadi Klinik"
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}
          {categoryKey === 'beslenme' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-text-primary">Mama Tipi / Markası</label>
              <input
                type="text"
                value={wizardData.metadata?.supply_type || ''}
                onChange={(e) => setStepData({ metadata: { ...wizardData.metadata, supply_type: e.target.value } })}
                placeholder="Örn: Royal Canin Kısırlaştırılmış"
                className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}
          {categoryKey === 'beslenme' && (subCat === 'Mama Siparişi' || subCat === 'Diyet Değişimi') && (
            <div 
              onClick={() => setShowScanner(true)}
              className="mt-4 p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl text-white cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="bg-surface/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Odi Premium</span>
                  <h3 className="font-extrabold text-[15px] mt-1">Akıllı Paket Tarama</h3>
                  <p className="text-[12px] text-white/90 font-normal leading-relaxed mt-0.5">
                    Mama paketini okutun, içeriği ve stok planını otomatik dolduralım.
                  </p>
                </div>
                <div className="opacity-90 bg-surface/20 p-2.5 rounded-xl backdrop-blur-sm shadow-sm">
                  <ScanLine className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step.type === 'vaccine_selection') {
      if (categoryKey === 'parazit') {
        const selectedProduct = wizardData.selectedProduct;
        return (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
            <button type="button" onClick={() => setShowScanner(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[50px] mb-2 w-full text-[13px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
              Karneyi / Ambalajı Tara
            </button>
            {productsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {products
                  .filter(p => selectedProduct === null || selectedProduct === undefined || selectedProduct?.id === p.id)
                  .map(product => {
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          const selected = isSelected ? null : product;
                          setStepData({ 
                            selectedProduct: selected,
                            metadata: {
                              ...wizardData.metadata,
                              duration_days: selected?.duration_days
                            }
                          });
                          if (!isSelected) {
                            setTimeout(() => {
                              if (currentStepIndex === totalSteps - 1) handleSubmit(); else nextStep();
                            }, 200);
                          }
                        }}
                        className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 border-primary' : 'bg-surface-1 border-border'}`}
                      >
                        <div>
                          <p className={`text-[13px] font-medium ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                            {product.brand_name} {product.product_name || ''}
                          </p>
                          {product.duration_days && (
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {product.duration_days} gün etkili
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={16} className="text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                }
            
                {/* Diğer — manuel giriş */}
                <button
                  onClick={() => {
                    setStepData({ 
                      selectedProduct: { 
                        id: 'other',
                        brand_name: 'Diğer',
                        product_name: null,
                        category: 'parasite_external',
                        duration_days: null
                      }
                    });
                    setTimeout(() => {
                      if (currentStepIndex === totalSteps - 1) handleSubmit(); else nextStep();
                    }, 200);
                  }}
                  className="w-full p-3 rounded-xl border border-dashed border-border text-text-secondary text-[13px] text-left"
                >
                  + Listede yok, kendim gireceğim
                </button>
              </div>
            )}
          </div>
        );
      }

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

      const groups = [
        { 
          level: 'core', 
          title: categoryKey === 'asi' ? 'Zorunlu Aşılar' : 'Zorunlu Uygulamalar', 
          items: filtered.filter((v) => v.group === 'core') 
        },
        { 
          level: 'optional', 
          title: categoryKey === 'asi' ? 'Opsiyonel Aşılar' : 'Opsiyonel Uygulamalar', 
          items: filtered.filter((v) => v.group === 'optional') 
        },
      ].filter((g) => g.items.length > 0);

      return (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
          <button type="button" onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[50px] mb-2 w-full text-[13px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
            Karneyi / Ambalajı Tara
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Marka veya ürün ara..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {loadingProducts ? (
              <p className="text-center text-[13px] text-text-secondary py-4">Ürünler Yükleniyor...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-[13px] text-text-secondary py-4">Eşleşen ürün bulunamadı.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <div key={g.level} className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      {g.title}
                    </p>
                    <div className="flex flex-col gap-2">
                      {g.items.map((vaccine) => {
                        const isSelected = wizardData.selectedVaccine?.code === vaccine.code;
                        return (
                          <button
                            key={`${vaccine.code}-${vaccine.name}`}
                            onClick={() => {
                              setStepData({ selectedVaccine: vaccine });
                              if (vaccine.protection_duration_days) {
                                 const d = new Date(wizardData.date || new Date());
                                 d.setDate(d.getDate() + vaccine.protection_duration_days);
                                 setStepData({ 
                                   frequency: 'once', 
                                   interval: 1, 
                                   date: d.toISOString().split('T')[0] 
                                 });
                              }
                              setTimeout(() => {
                                if (currentStepIndex === totalSteps - 1) {
                                  handleSubmit();
                                } else {
                                  nextStep();
                                }
                              }, 200);
                            }}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                              isSelected ? 'border-indigo-500 bg-indigo-50 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white hover:border-indigo-300'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                              {vaccine.image_url ? (
                                <Image src={vaccine.image_url} alt={vaccine.name} width={40} height={40} className="object-cover" />
                              ) : (
                                (vaccine.brand || vaccine.name).charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[13px] text-text-primary">{vaccine.name}</h4>
                              {vaccine.nameTr && <p className="text-[11px] text-slate-500 font-medium">{vaccine.nameTr}</p>}
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 mt-2.5">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 pt-4 border-t border-border-main">
            <label className="text-[13px] font-bold text-text-primary">Marka / Ürün Notu (İsteğe Bağlı)</label>
            <input
              type="text"
              value={wizardData.metadata?.custom_brand || ''}
              onChange={(e) => setStepData({ metadata: { ...wizardData.metadata, custom_brand: e.target.value } })}
              placeholder="Örn: Bayer Advocate, Zoetis..."
              className="w-full mt-1.5 p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
        </div>
      );
    }

    if (step.type === 'datetime_selection') {
      return (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-primary">Tarih</label>
            <input
              type="date"
              value={wizardData.date}
              onChange={(e) => setStepData({ date: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-primary">Saat</label>
            <input
              type="time"
              value={wizardData.time}
              onChange={(e) => setStepData({ time: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>
        </div>
      );
    }

    if (step.type === 'recurrence_selection') {
      const isRecurring = wizardData.frequency !== 'once';
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">Sıklık Seçimi</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'once',    label: 'Tek Sefer' },
                { value: 'daily',   label: 'Günlük'    },
                { value: 'weekly',  label: 'Haftalık'  },
                { value: 'monthly', label: 'Aylık'     },
                { value: 'yearly',  label: 'Yıllık'    },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStepData({ frequency: opt.value })}
                  className={`py-3 px-2 min-h-[50px] rounded-xl text-[12px] font-bold border flex items-center justify-center transition-all text-center ${
                    wizardData.frequency === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isRecurring && (
            <div className="flex flex-col gap-2 p-4 bg-surface border border-border-main rounded-2xl animate-in fade-in">
              <label className="text-[12px] font-bold text-text-secondary">Tekrar Aralığı</label>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-text-primary font-normal">Her</span>
                <div className="flex items-center bg-surface border border-border-main rounded-lg overflow-hidden shrink-0">
                  <button onClick={() => setStepData({ interval: Math.max(1, wizardData.interval - 1) })} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 font-bold">−</button>
                  <input type="number" min="1" value={wizardData.interval} onChange={(e) => setStepData({ interval: parseInt(e.target.value) || 1 })} className="w-12 text-center text-sm font-bold border-x border-slate-200 py-1 outline-none appearance-none" />
                  <button onClick={() => setStepData({ interval: wizardData.interval + 1 })} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 font-bold">+</button>
                </div>
                <span className="text-sm text-slate-700 font-medium">{FREQ_LABEL[wizardData.frequency]} tekrarlanacak</span>
              </div>

              <div className="mt-4 pt-4 border-t border-border-main space-y-3">
                <label className="text-[12px] font-bold text-text-secondary">Bitiş Koşulu</label>
                <div className="grid grid-cols-3 gap-2">
                  {END_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setStepData({ endCondition: opt.value as any })} className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition-all text-center ${wizardData.endCondition === opt.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {wizardData.endCondition === 'date' && (
                  <input type="date" min={wizardData.date} value={wizardData.endDate || ''} onChange={(e) => setStepData({ endDate: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                )}
                {wizardData.endCondition === 'occurrences' && (
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" value={wizardData.endOccurrences || 1} onChange={(e) => setStepData({ endOccurrences: parseInt(e.target.value) || 1 })} className="w-20 p-2 border border-slate-200 rounded-lg text-sm text-center" />
                    <span className="text-[12px] text-text-secondary font-normal">kez tekrarlandıktan sonra bitir</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step.type === 'notification_selection') {
      const isPastDate = wizardData.date <= new Date().toISOString().split('T')[0];
      
      return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between p-4 bg-surface border border-border-main rounded-2xl">
            <div>
              <p className="text-[13px] font-bold text-text-primary">Hatırlatıcı</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Görev zamanı yaklaştığında bildirim at</p>
            </div>
            <div className="flex items-center gap-2">
              {wizardData.notificationEnabled && (
                <select value={wizardData.notificationMinutes} onChange={(e) => setStepData({ notificationMinutes: parseInt(e.target.value) })} className="bg-slate-50 border border-slate-200 text-xs rounded-lg py-1.5 px-2 outline-none font-medium">
                  <option value={0}>Zamanında</option>
                  <option value={60}>1 saat önce</option>
                  <option value={180}>3 saat önce</option>
                  <option value={1440}>1 gün önce</option>
                  <option value={4320}>3 gün önce</option>
                </select>
              )}
              <div className="flex items-center justify-center w-11 h-11">
                <button onClick={() => setStepData({ notificationEnabled: !wizardData.notificationEnabled })} className={`w-11 h-6 rounded-full p-1 transition-colors ${wizardData.notificationEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${wizardData.notificationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-primary">Görev Notu</label>
            <textarea
              value={wizardData.notes || ''}
              onChange={(e) => setStepData({ notes: e.target.value })}
              placeholder="Eklemek istediğiniz notlar..."
              className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none min-h-[100px]"
            />
          </div>

          {isPastDate && (
             <label className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3 cursor-pointer group hover:bg-indigo-100/50 transition-colors">
              <div className="relative flex items-center mt-0.5 shrink-0">
               <input 
                 type="checkbox" 
                 checked={wizardData.markAsDone || false}
                 onChange={(e) => setStepData({ markAsDone: e.target.checked })}
                 className="peer appearance-none w-5 h-5 border-2 border-indigo-300 rounded bg-white checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
               />
               <svg className="absolute inset-0 w-5 h-5 text-white p-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
             </div>
             <div>
               <p className="text-sm font-bold text-indigo-900 mb-0.5">İşlem Uygulandı (Tamamlandı)</p>
               <p className="text-[11px] text-indigo-700/80 leading-relaxed">Geçmiş tarihli bu planın yapıldığını onaylıyorsanız işaretleyin.</p>
             </div>
           </label>
          )}
        </div>
      );
    }
  };

  // ── Başarı Ekranı ─────────────────────────────────────────────────
  if (isSuccess) {
    const petInfo = pets.find(p => p.id === wizardData.pet_id);
    const isAllergy = subCat === 'Alerji';
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="max-w-md mx-auto w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center shadow-inner mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{isAllergy ? 'Alerji Kaydı Oluşturuldu!' : (isEditMode ? 'Rutin Güncellendi!' : 'Rutin Oluşturuldu!')}</h2>
            <p className="text-slate-500 text-sm mt-1">{petInfo?.name || 'Evcil hayvanınız'} için {isAllergy ? 'alerji kaydı başarıyla oluşturuldu' : (isEditMode ? 'plan başarıyla güncellendi' : 'plan başarıyla kaydedildi')}.</p>
          </div>
          <div className="bg-surface rounded-3xl p-5 shadow-sm border border-border-main text-left space-y-3">
             {isAllergy ? (
               <>
                 <div className="flex justify-between items-start py-2 border-b border-slate-50">
                   <span className="text-[12px] font-semibold text-slate-400">Alerjen / Tetikleyici</span>
                   <span className="text-xs font-bold text-slate-800 text-right">{wizardData.metadata?.trigger_name}</span>
                 </div>
                 {wizardData.metadata?.symptoms && (
                   <div className="flex justify-between items-start py-2 border-b border-slate-50">
                     <span className="text-[12px] font-semibold text-slate-400">Semptomlar</span>
                     <span className="text-xs font-bold text-slate-800 text-right">{wizardData.metadata?.symptoms}</span>
                   </div>
                 )}
                 {wizardData.metadata?.treatment && (
                   <div className="flex justify-between items-start py-2">
                     <span className="text-[12px] font-semibold text-slate-400">Tedavi</span>
                     <span className="text-xs font-bold text-slate-800 text-right">{wizardData.metadata?.treatment}</span>
                   </div>
                 )}
               </>
             ) : (
               <>
                 <div className="flex justify-between items-start py-2 border-b border-slate-50">
                   <span className="text-[12px] font-semibold text-slate-400">Görev</span>
                   <span className="text-xs font-bold text-slate-800 text-right">{wizardData.selectedVaccine ? wizardData.selectedVaccine.name : (wizardData.subCategory === 'Diğer' ? wizardData.customText : wizardData.subCategory)}</span>
                 </div>
                 <div className="flex justify-between items-start py-2 border-b border-slate-50">
                   <span className="text-[12px] font-semibold text-slate-400">Zaman</span>
                   <span className="text-xs font-bold text-slate-800 text-right">{wizardData.date} {wizardData.time}</span>
                 </div>
                 <div className="flex justify-between items-start py-2">
                   <span className="text-[12px] font-semibold text-slate-400">Tekrar</span>
                   <span className="text-xs font-bold text-slate-800 text-right">{wizardData.frequency === 'once' ? 'Tek Seferlik' : `Her ${wizardData.interval} ${FREQ_LABEL[wizardData.frequency]}`}</span>
                 </div>
               </>
             )}
          </div>
          <button
            onClick={() => {
              resetWizard()
              router.push('/owner/plan-yap')
            }}
            className="w-full py-3.5 rounded-2xl border border-primary text-primary font-semibold text-[16px] transition-all duration-300 hover:bg-primary/5 mb-3">
            Planlama Yapmaya Devam Et
          </button>
          <button onClick={() => router.push(`/owner/pets/${wizardData.pet_id}`)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]">
            Pet Profiline Dön
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard Shell Render ───────────────────────────────────────────
  if (steps.length === 0) return null;

  const getSummaryForStep = (step: any) => {
    switch (step.key) {
      case 'pet_id':
        return pets.find(p => p.id === wizardData.pet_id)?.name || 'Belirtilmedi';
      case 'subCategory':
        return wizardData.subCategory === 'Diğer' ? wizardData.customText : wizardData.subCategory || 'Belirtilmedi';
      case 'selectedVaccine':
        if (categoryKey === 'parazit') {
          return wizardData.selectedProduct
            ? (wizardData.selectedProduct.product_name || wizardData.selectedProduct.brand_name)
            : 'Belirtilmedi';
        }
        return wizardData.selectedVaccine ? wizardData.selectedVaccine.name : 'Belirtilmedi';
      case 'metadata':
        if (subCat === 'Alerji') return wizardData.metadata?.trigger_name || 'Belirtilmedi';
        if (subCat === 'Belirti Takibi') return wizardData.metadata?.symptomNames?.join(', ') || 'Belirtilmedi';
        return 'Detay girildi';
      case 'datetime':
        return wizardData.date ? `${wizardData.date} ${wizardData.time || ''}`.trim() : 'Belirtilmedi';
      case 'recurrence':
        return wizardData.frequency === 'once' ? 'Tek Seferlik' : `Her ${wizardData.interval || 1} ${FREQ_LABEL[wizardData.frequency] || wizardData.frequency}`;
      case 'notification':
        return wizardData.notificationEnabled ? `${wizardData.notificationMinutes} dk önce` : 'Kapalı';
      default:
        return 'Tamamlandı';
    }
  };

  return (
    <>
      {isEditMode && stepIndex < steps.length && (
        <div className="max-w-3xl mx-auto w-full px-4 mb-4 mt-4 flex justify-end relative z-10">
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 px-4 py-2 bg-red-50 rounded-xl"
          >
            {isDeleting ? 'Siliniyor...' : 'Planı Sil'}
          </button>
        </div>
      )}
      <WizardShell
        category={categoryKey}
        onNext={currentStepIndex === totalSteps - 1 ? handleSubmit : nextStep}
        canSkip={steps[currentStepIndex]?.key === 'selectedVaccine' && categoryKey !== 'parazit'}
        skipText="Belirtmek İstemiyorum"
        onSkip={() => {
          setStepData({ selectedVaccine: null });
          nextStep();
        }}
        onBack={() => {
          const queryPetId = searchParams.get('pet_id');
          if (queryPetId && stepIndex === 1) {
            router.push(`/owner/pets/${queryPetId}`);
          } else {
            prevStep();
          }
        }}
        onSubmit={handleSubmit}
        isNextDisabled={isNextDisabled}
        isSubmitting={isSubmitting}
        steps={steps.map(step => ({
          title: step.title,
          summary: getSummaryForStep(step),
          content: renderStepContent(step)
        }))}
      />

      {showScanner && (
        <SmartScanner 
          petId={wizardData.pet_id} 
          onClose={() => setShowScanner(false)}
          onResult={(data: any) => {
            const parsed = data?.parsed;
            if (parsed) {
              if (parsed.vaccine_name || parsed.brand || parsed.title) {
                 setSearchQuery(parsed.vaccine_name || parsed.brand || parsed.title);
              }
              if (parsed.date) {
                 setStepData({ date: parsed.date });
              }
            }
            setShowScanner(false);
          }}
        />
      )}
    </>
  );
}
