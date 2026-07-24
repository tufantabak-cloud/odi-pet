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
import { StepperInput } from '@/components/ui/StepperInput';
import { normalizeSpecies } from '@/lib/species';
import {
  isProductSpeciesCompatible,
  isProductTypeCompatibleWithProtocol,
  normalizeProductMethod,
} from '@/features/pets/parasite-product-compat';

// ── Eşleştirmeler ──────────────────────────────────────────────────
const categoryMap: Record<string, TaskCategory> = {
  saglik: 'Saglik',
  asi: 'Medikal',
  parazit: 'Medikal',
  bakim: 'Bakım',
  beslenme: 'Beslenme',
  hijyen: 'Hijyen',
  aktivite: 'Aktiviteler',
  kontrol: 'Veteriner'
};

const FREQ_LABEL: Record<string, string> = {
  hour: 'saat',
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

  // "Kayıt Ekle" (geriye dönük kayıt) modu: planlanmamış ama o an uygulanmış bir
  // işlemi kaydeder. Aynı sihirbaz motorunu kullanır; yalnızca varsayılanları ve
  // çerçevelemeyi değiştirir. Düzenlemede (editId) log modu devreye girmez.
  const logMode = searchParams.get('mode') === 'log' && !editId;

  // Timeline'daki boş bir tarih hücresine tıklanınca gelen ön-doldurma parametreleri
  const queryDate = searchParams.get('date');
  const queryMedName = searchParams.get('medName');
  const queryVaccineName = searchParams.get('vaccineName');
  const queryVaccineCode = searchParams.get('vaccine_code');

  // URL'den gelen alt kategori (subCat): geçerliyse alt kategori adımı atlanır (create modunda)
  const querySubCat = searchParams.get('subCat');
  const initialSubCat = (() => {
    if (!querySubCat || editId) return null;
    const tcForParam = categoryMap[categoryKey];
    if (!tcForParam) return null;
    let subs = getFilteredSubCategories(tcForParam, null);
    if (categoryKey === 'parazit') subs = subs.filter(s => s.id.includes('Parazit'));
    return subs.some(s => s.id === querySubCat) ? querySubCat : null;
  })();
  
  const { stepIndex, wizardData, setStepData, setStepIndex, nextStep, prevStep, resetWizard } = useWizardStore();
  const [pets, setPets] = useState<any[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  /**
   * isEditMode ARTIK doğrudan bu state'ten türetiliyor (aşağıda), ayrı bir
   * useState olarak TUTULMUYOR. Neden: Next.js App Router aynı [kategori]
   * segmentine (örn. önce boş bir tarih hücresinden 'oluştur' linkiyle,
   * sonra bir kaydın 'Düzenle'siyle) art arda client-side navigasyonlarda
   * bileşeni YENİDEN MOUNT ETMEZ — yalnızca yeniden render eder. Eski
   * kod `useState(!!editId)` kullanıyordu ve 'else' dalı (plan bulunamadı/
   * create modu) bunu asla false'a çevirmiyordu; bu da önceki bir CREATE
   * navigasyonundan kalan `false` değerinin, editId artık dolu olsa bile
   * plan verisi her nasılsa yüklenemediğinde (RLS/hata) YANLIŞLIKLA
   * step-by-step sihirbazın (editAll=false) gösterilmesine yol açabiliyordu.
   * Reaktif türetim bu sınıf hatayı tamamen ortadan kaldırır.
   */
  const [loadedPlan, setLoadedPlan] = useState<any>(null);
  // editId verildi ama plan yüklenemedi (silinmiş/RLS/erişilemez) → sessiz create
  // moduna düşmek yerine açık hata göster; ayrıca handleSubmit'in yanlışlıkla ölü
  // bir editId'ye PATCH atmasını engeller.
  const [editLoadFailed, setEditLoadFailed] = useState(false);
  const isEditMode = !!editId && !!loadedPlan;
  // Düzenlemede planın orijinal extra_data'sı; kayıtta üzerine yazılmayan alanlar (dose_number, migrated_from vb.) korunur
  const [initialExtraData, setInitialExtraData] = useState<Record<string, any> | null>(null);
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

  // Katalog Ürünü Seçimi State (seçili protokole uyumlu gerçek SKU'lar —
  // extra_data.product.id'nin (protokol UUID'si) SEMANTİĞİNE dokunmaz; bkz.
  // complete_parasite_plan RPC'si (20260716090000). Tamamen eklemeli.
  const [catalogProducts, setCatalogProducts] = useState<Array<{
    id: string
    name: string
    brand: string
    species: string
    type: string
    application_method: string
    protection_duration_days: number
  }>>([])
  const [catalogProductsLoading, setCatalogProductsLoading] = useState(false)

  // Smart Scanner State
  const [showScanner, setShowScanner] = useState(false);

  // ── İlişkilendirme (Log modu): eşleşen aktif planlar ─────────────────
  // Kayıt Ekle'de girilen işlem, zaten planlanmış aktif bir görevin parçası
  // olabilir. Aynı pet + kategori + alt tür için aktif planları getirir; varsa
  // kullanıcı bu kaydı o plana bağlayabilir (çift kayıt yerine planı tamamlar).
  const [matchingPlans, setMatchingPlans] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchSub, setMatchSub] = useState<string | null>(null);

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
        setEditLoadFailed(false);
        const { data: planData, error: planError } = await supabase.from('plans').select('*').eq('id', editId).single();
        if (planData) {
          initialPlanData = planData;
          setInitialExtraData(planData.extra_data || {});
        } else {
          // Sessizce create moduna düşmek yerine görünür kılıyoruz — RLS/izin
          // sorunları veya artık var olmayan bir plan burada yakalanır.
          console.error('[plan-yap] editId ile plan yüklenemedi:', editId, planError);
          setEditLoadFailed(true);
        }
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
        // İlaç Kullanımı sub_type'ı → wizard'da 'İlaç' olarak tanınmalı
        const isMedication = initialPlanData.extra_data?.record_type === 'medication' || initialPlanData.sub_type === 'İlaç Kullanımı';
        const resolvedSubCategory = isMedication ? 'İlaç' : (isDiğer ? 'Diğer' : initialPlanData.sub_type);
        
        const med = initialPlanData.extra_data?.medication;
        let resolvedProduct = initialPlanData.extra_data?.product || null;
        if (typeof resolvedProduct === 'string') {
          resolvedProduct = {
            id: 'other',
            brand_name: resolvedProduct,
            product_name: null,
            category: 'parasite_external',
            duration_days: initialPlanData.extra_data?.duration_days ?? null
          };
        } else if (resolvedProduct && typeof resolvedProduct === 'object') {
          if (resolvedProduct.duration_days == null) {
            resolvedProduct.duration_days = initialPlanData.extra_data?.duration_days ?? initialPlanData.extra_data?.metadata?.duration_days ?? null;
          }
        }

        setStepData({
          pet_id: initialPlanData.pet_id,
          subCategory: resolvedSubCategory,
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
          selectedProduct: resolvedProduct,
          plannedProduct: initialPlanData.extra_data?.planned_product
            ? {
                id: initialPlanData.extra_data.planned_product.parasite_product_id,
                brand: initialPlanData.extra_data.planned_product.brand,
                name: initialPlanData.extra_data.planned_product.name,
                protection_duration_days: initialPlanData.extra_data.planned_product.protection_duration_days,
              }
            : null,
          markAsDone: initialPlanData.extra_data?.is_past_done || false,
          // İlaç düzenleme: mevcut ilaç verilerini wizard'a yükle
          ...(isMedication && med ? {
            medication_name: med.name || '',
            medication_unit: med.unit || 'Tablet',
            medication_dose: med.dose || 1,
            medication_purpose: med.purpose || '',
            medication_freq_type: med.freq_type || 'once_daily',
            medication_photo_url: med.photo_url || null,
            medication_stock_enabled: med.stock_enabled || false,
            medication_stock_count: med.stock ?? 30,
            medication_alert_count: med.alert_threshold ?? 10,
          } : {}),
        });
        setLoadedPlan(initialPlanData);
      } else {
        // Önceki bir DÜZENLEME navigasyonundan kalan loadedPlan'ı temizle —
        // aksi halde aynı [kategori] segmentinde CREATE moduna geçildiğinde
        // (bileşen yeniden mount edilmediği için) isEditMode yanlışlıkla
        // true kalabilir.
        setLoadedPlan(null);
        setStepData({
          pet_id: queryPetId || undefined,
          subCategory: initialSubCat || undefined,
          date: queryDate || d.toISOString().split('T')[0],
          // Log modunda işlem "az önce yapıldı" varsayılır: saat = şimdi
          time: logMode ? new Date().toTimeString().slice(0, 5) : '12:00',
          frequency: 'once',
          interval: 1,
          endCondition: 'never',
          notificationMinutes: 0,
          notificationEnabled: true,
          // Log modunda kayıt otomatik "yapıldı" (tamamlandı) olarak işaretlenir
          markAsDone: logMode ? true : false,
          metadata: {},
          notes: '',
          selectedProduct: null,
          plannedProduct: null,
          // Timeline'daki ilgili kayıt satırından geldiyse ilaç adını ön doldur
          medication_name: queryMedName || undefined,
        });
      }

      if (categoryKey === 'beslenme' && queryPetId) {
        router.replace(`/owner/pets/${queryPetId}/nutrition`);
        return;
      }

      const { data, error } = await supabase.from('pets').select('id, name, species, avatar_url');
      let petCount = 0;
      if (!error && data) {
        petCount = data.length;
        setPets(data.map((p: any) => ({ ...p, type: p.species })));
        if (data.length === 1 && !initialPlanData && !queryPetId && categoryKey !== 'beslenme') {
          setStepData({ pet_id: data[0].id });
        }
      }

      if (initialPlanData) {
        // Düzenleme modunda veya URL'de pet_id varsa, pet seçimi adımı listede yer alıyorsa (petCount > 1) 1. index'ten başla, yoksa 0'dan başla
        setStepIndex(petCount > 1 ? 1 : 0);
      } else if (queryPetId) {
        setStepIndex(petCount > 1 ? 1 : 0);
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
    // Düzenleme modunda plandan yüklenen değerleri (sıklık, bildirim vb.) varsayılanlarla ezme
    if (editId) return;
    const subCat = categoryKey === 'asi' ? 'Aşı' : wizardData.subCategory;
    if (subCat && subCat !== 'Diğer') {
      const defaults = getSmartDefault(subCat);
      const updateData: any = {
        // Log modunda "Kayıt Ekle" doğası gereği tek seferliktir; tekrar opt-in
        // olur. Bu yüzden alt kategorinin akıllı tekrar sıklığını uygulamayız.
        frequency: logMode ? 'once' : defaults.frequency,
        interval: defaults.interval,
        notificationMinutes: defaults.notification_minutes,
      };

      if (subCat === 'İlaç') {
        updateData.medication_dose = 1;
        updateData.medication_days = 7;
        updateData.medication_stock_count = 30;
        updateData.medication_alert_count = 10;
        updateData.medication_duration = 'days'; // default duration type
      }

      setStepData(updateData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardData.subCategory, categoryKey]);

  // ── Eşleşen aktif planları getir (yalnızca Log modu, genel kategoriler) ──
  // Kapsam: aşı/parazit (kendi protokol/RPC akışları var), İlaç, Alerji ve
  // 'Diğer' (serbest metin) hariç. Bunlarda sub_type doğrudan alt kategoriyle
  // eşleşir, güvenli tamamlanabilir.
  const linkEligibleBase =
    logMode &&
    categoryKey !== 'asi' &&
    categoryKey !== 'parazit' &&
    !!wizardData.subCategory &&
    wizardData.subCategory !== 'İlaç' &&
    wizardData.subCategory !== 'Alerji' &&
    wizardData.subCategory !== 'Diğer';

  useEffect(() => {
    // Alt kategori/pet değişince önceki bağlantı seçimini sıfırla
    setStepData({ linkedPlanId: undefined });

    if (!linkEligibleBase || !wizardData.pet_id) {
      setMatchingPlans([]);
      setMatchLoading(false);
      setMatchSub(null);
      return;
    }

    const petId = wizardData.pet_id;
    const sub = wizardData.subCategory as string;
    let cancelled = false;
    setMatchLoading(true);
    setMatchingPlans([]);

    const supabase = createBrowserSupabaseClient();
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('pet_id', petId)
        .eq('category', categoryKey)
        .eq('status', 'active')
        .eq('sub_type', sub);
      if (cancelled) return;
      setMatchingPlans(data || []);
      setMatchSub(sub);
      setMatchLoading(false);
    };
    fetchMatches();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logMode, categoryKey, wizardData.pet_id, wizardData.subCategory]);

  // ── Fetch Vaccines / Products (Aşı veya Parazit ise) ────────────────
  useEffect(() => {
    const subCat = categoryKey === 'asi' ? 'Aşı' : wizardData.subCategory;
    const isVaccineOrParasite = subCat === 'Aşı' || subCat === 'İç Parazit' || subCat === 'Dış Parazit' || subCat === 'Parazit Tasması' || subCat === 'Birleşik Parazit';
    
    if (isVaccineOrParasite && speciesStr && wizardData.pet_id) {
      const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
          const isVaccine = subCat === 'Aşı';

          if (isVaccine) {
            const res = await fetch(`/api/pets/${wizardData.pet_id}/vaccine-preferences`);
            const data = await res.json();
            const protocols = data.protocols || [];
            
            // Filter by enabled === true
            const enabledProtocols = protocols.filter((p: any) => p.enabled === true);

            const templateOptions = enabledProtocols.map((t: any) => ({
              code: t.vaccine_code,
              name: t.protocol_name,
              nameTr: t.protocol_name,
              group: t.category === 'legal' || t.category === 'core' ? 'core' : 'optional',
              isParasite: false,
              isTemplate: true,
            }));

            setDbProducts(templateOptions);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingProducts(false);
        }
      };
      fetchProducts();
    }
  }, [wizardData.subCategory, categoryKey, speciesStr, wizardData.pet_id]);

  // ── Timeline'dan gelen aşı adını veya kodunu otomatik seç (yalnızca oluşturma modunda) ──
  useEffect(() => {
    if (editId || wizardData.selectedVaccine || dbProducts.length === 0) return;
    if (queryVaccineCode) {
      const match = dbProducts.find(p => p.code === queryVaccineCode);
      if (match) {
        setStepData({ selectedVaccine: match });
        return;
      }
    }
    if (queryVaccineName) {
      const target = queryVaccineName.toLocaleLowerCase('tr-TR').trim();
      const match = dbProducts.find(p => (p.name || p.nameTr || '').toLocaleLowerCase('tr-TR').trim() === target)
        ?? dbProducts.find(p => (p.name || p.nameTr || '').toLocaleLowerCase('tr-TR').includes(target));
      if (match) setStepData({ selectedVaccine: match });
    }
  }, [dbProducts, editId, queryVaccineName, queryVaccineCode]);

  // ── Fetch Parazit / Mama Products ─────────────────────────────────
  useEffect(() => {
    if (categoryKey !== 'parazit') return;
    if (!wizardData.subCategory || !wizardData.pet_id) return;

    setProductsLoading(true);
    
    fetch(`/api/pets/${wizardData.pet_id}/parasite-preferences`)
      .then(r => r.json())
      .then(data => {
        const protocols = Array.isArray(data) ? data : [];
        const enabledProtocols = protocols.filter((p: any) => p.enabled === true);
        
        const subCat = wizardData.subCategory;
        const filtered = enabledProtocols.filter((p: any) => {
          if (subCat === 'İç Parazit') {
            return p.parasite_type === 'internal' || p.parasite_type === 'combined';
          }
          if (subCat === 'Dış Parazit') {
            return p.parasite_type === 'external' || p.parasite_type === 'combined';
          }
          if (subCat === 'Birleşik Parazit') {
            return p.parasite_type === 'combined';
          }
          if (subCat === 'Parazit Tasması') {
            return p.parasite_type === 'collar';
          }
          return false;
        });

        const mapped = filtered.map((p: any) => ({
          id: p.id,
          brand_name: p.protocol_name,
          product_name: null,
          category: p.parasite_type,
          duration_days: p.default_protection_duration_days,
          parasite_code: p.parasite_code,
          // Katalog ürünü uyum filtresi için (bkz. yeni catalogProducts effect'i)
          allowed_application_methods: p.allowed_application_methods || [],
        }));

        setProducts(mapped);
      })
      .catch(console.error)
      .finally(() => setProductsLoading(false));

  }, [categoryKey, wizardData.subCategory, wizardData.pet_id]);

  // ── Seçili protokole uyumlu katalog ürünlerini getir (P1 kataloğu) ─────
  // extra_data.product.id (protokol UUID'si) semantiğine dokunmaz — yalnızca
  // gösterim + süre ön-doldurma için ayrı, eklemeli bir listedir.
  useEffect(() => {
    if (categoryKey !== 'parazit') { setCatalogProducts([]); return; }
    const protocol = wizardData.selectedProduct;
    if (!protocol || protocol.id === 'other' || !speciesStr) { setCatalogProducts([]); return; }

    let cancelled = false;
    setCatalogProductsLoading(true);
    const fetchCatalog = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('parasite_products')
        .select('id, name, brand, species, type, application_method, protection_duration_days, is_active')
        .eq('is_active', true)
        .in('species', [speciesStr, 'both']);
      if (cancelled) return;

      const allowedMethods: string[] = protocol.allowed_application_methods || [];
      const compatible = (data || []).filter((p: { species: string; type: string; application_method: string }) =>
        isProductSpeciesCompatible(p.species, speciesStr) &&
        isProductTypeCompatibleWithProtocol(p, protocol.category) &&
        allowedMethods.includes(normalizeProductMethod(p.application_method))
      );
      setCatalogProducts(compatible);

      // Protokol değiştiğinde, artık uyumlu olmayan eski katalog seçimi varsa temizle.
      // 'manual' (listede yok, elle girilen ürün) seçimi korunur.
      if (wizardData.plannedProduct && wizardData.plannedProduct.id !== 'manual' && !compatible.some((c: { id: string }) => c.id === wizardData.plannedProduct.id)) {
        setStepData({ plannedProduct: null });
      }
    };
    fetchCatalog().finally(() => { if (!cancelled) setCatalogProductsLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey, wizardData.selectedProduct?.id, speciesStr]);

  // ── Timeline'dan gelen parazit ürün adını otomatik seç (yalnızca oluşturma modunda) ──
  useEffect(() => {
    if (editId || !queryVaccineName || wizardData.selectedProduct || products.length === 0) return;
    const target = queryVaccineName.toLocaleLowerCase('tr-TR').trim();
    const match = products.find(p => (p.product_name || p.brand_name || '').toLocaleLowerCase('tr-TR').trim() === target)
      ?? products.find(p => (p.product_name || p.brand_name || '').toLocaleLowerCase('tr-TR').includes(target));
    if (match) setStepData({ selectedProduct: match });
  }, [products, editId, queryVaccineName]);

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

  // editId verildi ama plan yüklenemedi → boş "oluştur" formuna sessizce düşme;
  // açık hata göster. (Silinmiş plan, RLS veya artık geçersiz bir düzenleme linki.)
  if (editId && editLoadFailed) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="text-xl font-black text-text-primary mb-1">Plan bulunamadı</h2>
        <p className="text-sm text-text-secondary max-w-xs mb-6">Düzenlemek istediğiniz plan silinmiş veya artık erişilemiyor olabilir.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link href="/owner/plan-yap" className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold text-center hover:bg-indigo-700 transition-colors">
            Yeni Plan Oluştur
          </Link>
          <button onClick={() => router.push('/owner/dashboard')} className="w-full py-3 rounded-2xl border border-border-main text-text-secondary font-semibold hover:bg-bg-main transition-colors">
            Panoya Dön
          </button>
        </div>
      </div>
    );
  }

  const tc = categoryMap[categoryKey];
  if (!tc) {
    return <div className="min-h-screen bg-slate-50 p-6">Geçersiz Kategori.</div>;
  }

  // ── Adımları Hesapla ──────────────────────────────────────────────
  const needsPetSelection = pets.length > 1;
  const steps: any[] = [];
  
  // Düzenlemede pet zaten belli; pet seçim adımı yalnızca yeni plan oluştururken gösterilir
  if (needsPetSelection && !isEditMode) {
    steps.push({ key: 'pet_id', type: 'pet_selection', title: 'Kimin için planlıyoruz?', desc: 'Evcil hayvan profilinizi seçin.' });
  }

  if (categoryKey !== 'asi' && !initialSubCat) {
    steps.push({ key: 'subCategory', type: 'subcategory_selection', title: 'Alt Kategori', desc: 'Ne planlamak istiyorsunuz?' });
  }

  const subCat = categoryKey === 'asi' ? 'Aşı' : wizardData.subCategory;
  const isVaccineOrParasite = subCat === 'Aşı' || subCat === 'İç Parazit' || subCat === 'Dış Parazit' || subCat === 'Parazit Tasması' || subCat === 'Birleşik Parazit';

  // ── İlişkilendirme durumu (Log modu) ──────────────────────────────
  // Kullanıcı eşleşen bir planlı görevi seçtiyse (linkedPlanId gerçek bir id),
  // kayıt o planı tamamlar; yeni bağımsız kayıt oluşturulmaz.
  const isLinked = logMode && typeof wizardData.linkedPlanId === 'string' && wizardData.linkedPlanId !== 'none';
  const linkedPlan = isLinked ? matchingPlans.find((p) => p.id === wizardData.linkedPlanId) : null;
  // İlişkilendirme adımının durumu: kapalı / yükleniyor / seç / eşleşme yok
  const linkStepMode: 'off' | 'loading' | 'select' | 'none' = !linkEligibleBase
    ? 'off'
    : (matchLoading || matchSub !== wizardData.subCategory)
      ? 'loading'
      : matchingPlans.length > 0
        ? 'select'
        : 'none';
  
  if (isVaccineOrParasite) {
    const dynamicTitle = categoryKey === 'asi' ? 'Aşı Seçimi' : `${subCat} Seçimi`;
    steps.push({ key: 'selectedVaccine', type: 'vaccine_selection', title: dynamicTitle, desc: `${subCat} için uygulanan veya planlanan ürünü seçin.` });
  }

  if (subCat === 'İlaç') {
    steps.push({ key: 'medication_info', type: 'medication_info', title: 'Hangi ilacı ekliyorsunuz?', desc: 'İlaç adını ve formunu belirtin.' });
    steps.push({ key: 'medication_purpose', type: 'medication_purpose', title: 'Kullanım Amacı', desc: 'Bunu ne için kullanıyorsunuz?' });
    steps.push({ key: 'medication_frequency', type: 'medication_frequency', title: 'Kullanım Sıklığı', desc: 'İlacı ne sıklıkla veriyorsunuz?' });
    steps.push({ key: 'medication_datetime', type: 'medication_datetime', title: 'Tarih & Doz', desc: 'İlk dozu ne zaman vereceksiniz?' });
    steps.push({ key: 'medication_stock', type: 'medication_stock', title: 'Stok Takibi', desc: 'İlaç bitmeden hatırlatalım mı?' });
  } else {
    const showMetadata = () => {
      // Düzenleme modunda her plan için Detaylar kartı göster (özel alan yoksa not alanı fallback'i devreye girer)
      if (isEditMode) return true;
      if (subCat === 'Diğer') return true;
      if (subCat === 'Alerji') return true;
      if (!subCat && categoryKey !== 'asi') return false; // Alt kategori seçilmeden gösterme
      
      if (categoryKey === 'saglik') {
        const excluded = ['Kilo Takibi'];
        return !excluded.includes(subCat);
      }
      if (categoryKey === 'beslenme') {
        const excluded = ['Su Tazeleme', 'Öğün'];
        return !excluded.includes(subCat);
      }
      return false;
    };

    // Log modu ilişkilendirme adımı: eşleşen planlı görev varsa (veya kontrol
    // ediliyorsa) "Bunu zaten planlamış mıydınız?" adımı araya girer.
    if (linkStepMode === 'loading') {
      steps.push({ key: 'link_plan', type: 'link_plan_loading', title: 'Planlı görev mi?', desc: 'Kontrol ediliyor…' });
    } else if (linkStepMode === 'select') {
      steps.push({ key: 'link_plan', type: 'link_plan_selection', title: 'Planlı görev mi?', desc: 'Bu işlem zaten planladığınız bir görev olabilir.' });
    }

    if (isLinked) {
      // Bir planlı göreve bağlandı: yalnızca onay adımı gösterilir. Kayıt,
      // mevcut planı "yapıldı" olarak tamamlar (tekrarlıysa ileri taşır);
      // ayrı/çift kayıt oluşturmaz.
      steps.push({ key: 'notification', type: 'notification_selection', title: 'Onayla', desc: 'Planlı görevi tamamlayın.' });
    } else {
      if (showMetadata()) {
        steps.push({ key: 'metadata', type: 'metadata_selection', title: 'Detaylar', desc: 'Planla ilgili ekstra detaylar girin.' });
      }

      // Alerji kaydı için tarih-saat, tekrar ve bildirim adımlarını atlayalım
      if (subCat !== 'Alerji') {
        steps.push({ key: 'datetime', type: 'datetime_selection', title: logMode ? 'Ne Zaman Yapıldı?' : 'Tarih & Saat', desc: logMode ? 'İşlemi ne zaman uyguladınız?' : 'İşlem ne zaman gerçekleşecek?' });
        steps.push({ key: 'recurrence', type: 'recurrence_selection', title: logMode ? 'Tekrarlanacak mı?' : 'Tekrar Sıklığı', desc: logMode ? 'Bu işlem düzenli tekrar ediyorsa bir plan da oluşturalım.' : 'Bu plan tekrarlanacak mı?' });
        steps.push({ key: 'notification', type: 'notification_selection', title: logMode ? 'Onay & Not' : 'Bildirim', desc: logMode ? 'Kaydı onaylayın, dilerseniz not ekleyin.' : 'Hatırlatıcı ayarlarınızı tamamlayın.' });
      }
    }
  }

  const totalSteps = steps.length;
  // Use a clamped index in case we jump around
  const currentStepIndex = Math.min(stepIndex, totalSteps - 1);
  const currentStep = steps[currentStepIndex];

  // ── Next Butonu Validasyonu ───────────────────────────────────────
  let isNextDisabled = false;
  if (currentStep?.key === 'pet_id' && !wizardData.pet_id) isNextDisabled = true;
  if (currentStep?.key === 'subCategory' && !wizardData.subCategory) isNextDisabled = true;
  if (currentStep?.key === 'link_plan' && wizardData.linkedPlanId === undefined) isNextDisabled = true;
  if (currentStep?.key === 'selectedVaccine' && (categoryKey === 'parazit' ? !wizardData.selectedProduct : !wizardData.selectedVaccine)) isNextDisabled = true;
  if (currentStep?.key === 'datetime' && !wizardData.date) isNextDisabled = true;
  if (currentStep?.key === 'metadata' && subCat === 'Diğer' && !wizardData.customText?.trim()) isNextDisabled = true;
  if (currentStep?.key === 'metadata' && subCat === 'Alerji' && !wizardData.metadata?.trigger_name?.trim()) isNextDisabled = true;
  if (currentStep?.key === 'metadata' && subCat === 'Belirti Takibi' && selectedSymptoms.length === 0) isNextDisabled = true;
  if (currentStep?.key === 'recurrence' && wizardData.frequency !== 'once' && wizardData.endCondition === 'date' && !wizardData.endDate) isNextDisabled = true;

  // Medication validation
  if (currentStep?.key === 'medication_info' && (!wizardData.medication_name || !wizardData.medication_unit)) isNextDisabled = true;
  if (currentStep?.key === 'medication_frequency' && !wizardData.medication_freq_type) isNextDisabled = true;
  if (currentStep?.key === 'medication_datetime' && (!wizardData.date || !wizardData.time || !wizardData.medication_dose)) isNextDisabled = true;

  // Düzenleme (tek sayfa form) modunda tüm alanların toplu validasyonu
  const stepKeys = steps.map(s => s.key);
  const isEditSaveDisabled =
    (stepKeys.includes('pet_id') && !wizardData.pet_id) ||
    (stepKeys.includes('subCategory') && !wizardData.subCategory) ||
    (stepKeys.includes('datetime') && !wizardData.date) ||
    (stepKeys.includes('metadata') && subCat === 'Diğer' && !wizardData.customText?.trim()) ||
    (stepKeys.includes('metadata') && subCat === 'Alerji' && !wizardData.metadata?.trigger_name?.trim()) ||
    (stepKeys.includes('recurrence') && wizardData.frequency !== 'once' && wizardData.endCondition === 'date' && !wizardData.endDate) ||
    (subCat === 'İlaç' && (!wizardData.medication_name || !wizardData.medication_unit || !wizardData.date || !wizardData.time || !wizardData.medication_dose || !wizardData.medication_freq_type));

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

    // ── İlişkilendirilmiş kayıt: mevcut planı tamamla (çift kayıt yok) ──
    // Zaman çizelgesindeki "yapıldı" akışıyla birebir aynı: PATCH status=completed
    // → updatePlan tekrarlıysa geçmiş kaydını bırakıp planı ileri taşır.
    if (isLinked && wizardData.linkedPlanId) {
      try {
        const res = await fetch(`/api/plans/${wizardData.linkedPlanId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });
        if (res.ok) {
          setIsSuccess(true);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(`Hata: ${errData.error || 'Görev tamamlanamadı'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Beklenmeyen bir hata oluştu.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

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

    if (subCat === 'İlaç' || subCat === 'İlaç Kullanımı') {
       let repeat_rule = null;
       let scheduledAt = `${wizardData.date || new Date().toISOString().split('T')[0]}T${wizardData.time || '09:00'}:00`;
       
       if (wizardData.medication_freq_type === 'once_daily') {
          repeat_rule = 'daily';
          wizardData.interval = 1;
       } else if (wizardData.medication_freq_type === 'once_weekly') {
          repeat_rule = 'weekly';
          wizardData.interval = 1;
       } else if (wizardData.medication_freq_type === 'as_needed') {
          repeat_rule = null;
          scheduledAt = new Date().toISOString(); 
       }
       
       let endsAt = null;
       if (wizardData.medication_duration === 'days' && wizardData.medication_days) {
          const d = new Date(scheduledAt);
          d.setDate(d.getDate() + wizardData.medication_days);
          endsAt = d.toISOString();
       }
       
       const extra_data = {
         // Düzenlemede orijinal extra_data'daki ek alanlar korunur
         ...(initialExtraData || {}),
         record_type: 'medication',
         source: initialExtraData?.source ?? 'plan_yap',
         medication: {
           name: wizardData.medication_name,
           unit: wizardData.medication_unit,
           dose: wizardData.medication_dose,
           dosage_string: `${wizardData.medication_dose} ${wizardData.medication_unit}`,
           photo_url: wizardData.medication_photo_url || null,
           purpose: wizardData.medication_purpose || null,
           freq_type: wizardData.medication_freq_type,
           stock_enabled: wizardData.medication_stock_enabled,
           stock: wizardData.medication_stock_enabled ? (wizardData.medication_stock_count || 30) : null,
           alert_threshold: wizardData.medication_stock_enabled ? (wizardData.medication_alert_count || 10) : null
         }
       };
       
       const medPayload = {
         pet_id: petId,
         category: categoryKey,
         sub_type: 'İlaç Kullanımı',
         scheduled_at: new Date(scheduledAt).toISOString(),
         repeat_rule: repeat_rule,
         ends_at: endsAt,
         notif_before: wizardData.medication_freq_type === 'as_needed' ? null : 0, 
         notif_unit: 'minute',
         note: wizardData.notes || null,
         extra_data: extra_data
       };
       
       try {
         const res = await fetch('/api/plans' + (isEditMode ? `/${editId}` : ''), {
           method: isEditMode ? 'PATCH' : 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(medPayload),
         });

         if (res.ok) {
           setIsSuccess(true);
         } else {
           const errData = await res.json();
           alert(`Hata: ${errData.error || 'İlaç kaydedilemedi'}`);
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
      sub_type: categoryKey === 'asi'
        // Aşı seçilmediyse mevcut planın adını (subCategory'ye yüklenen sub_type) koru; 'Aşı' ile ezme
        ? (wizardData.selectedVaccine?.name || wizardData.subCategory || 'Aşı')
        : subCat === 'Diğer' ? (wizardData.customText || 'Diğer') : (subCat || 'Genel'),
      scheduled_at: new Date(scheduledAt).toISOString(),
      repeat_rule: wizardData.frequency === 'once' ? null : wizardData.frequency,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      notif_before: wizardData.notificationEnabled ? (wizardData.notificationMinutes || 0) : 0,
      notif_unit: 'minute',
      note: wizardData.notes || null,
      extra_data: {
        // Düzenlemede orijinal extra_data korunur (dose_number, migrated_from, confidence_level vb.);
        // formdan gelen alanlar aşağıda üzerine yazılır
        ...(initialExtraData || {}),
        interval: wizardData.interval,
        endCondition: wizardData.endCondition,
        endOccurrences: wizardData.endOccurrences,
        metadata: wizardData.metadata,
        vaccine: wizardData.selectedVaccine
          ? { code: wizardData.selectedVaccine.code ?? null, name: wizardData.selectedVaccine.name ?? null }
          : (initialExtraData?.vaccine ?? null),
        vaccine_code: wizardData.selectedVaccine?.code ?? initialExtraData?.vaccine_code ?? null,
        record_type: categoryKey === 'asi' ? 'vaccine_schedule' : (initialExtraData?.record_type ?? null),
        source: initialExtraData?.source ?? 'plan_yap',
        product: wizardData.selectedProduct ? {
          id: wizardData.selectedProduct.id,
          brand_name: wizardData.selectedProduct.brand_name ?? null,
          product_name: wizardData.selectedProduct.product_name ?? null,
          category: wizardData.selectedProduct.category ?? null,
          duration_days: wizardData.selectedProduct.duration_days ?? null
        } : (initialExtraData?.product ?? null),
        // Katalogdan seçilen gerçek SKU VEYA elle girilen ürün (opsiyonel, salt
        // gösterim/süre-önerisi içindir). "product" alanındaki protokol UUID'sinin
        // YERİNE geçmez. Elle giriş (id='manual') → parasite_product_id null.
        planned_product: (() => {
          const pp = wizardData.selectedProduct?.id === 'other' ? null : wizardData.plannedProduct;
          if (!pp) return (initialExtraData?.planned_product ?? null);
          const brand = (pp.brand ?? '').trim() || null;
          const name = (pp.name ?? '').trim() || null;
          if (pp.id === 'manual' && !brand && !name) return null; // boş elle giriş
          return {
            parasite_product_id: pp.id === 'manual' ? null : pp.id,
            brand,
            name,
            protection_duration_days: pp.protection_duration_days ?? null,
          };
        })(),
        is_past_done: !!wizardData.markAsDone
      },
    };

    try {
      const res = await fetch('/api/plans' + (isEditMode ? `/${editId}` : ''), {
        method: isEditMode ? 'PATCH' : 'POST',
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

    if (step.type === 'link_plan_loading') {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3 animate-in fade-in">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-text-secondary">Planlı görevleriniz kontrol ediliyor…</p>
        </div>
      );
    }

    if (step.type === 'link_plan_selection') {
      const fmtDate = (iso: string) => {
        try { return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' }); } catch { return ''; }
      };
      const fmtFreq = (p: any) => p.repeat_rule
        ? `Her ${p.extra_data?.interval || 1} ${FREQ_LABEL[p.repeat_rule] || ''}`.trim()
        : 'Tek seferlik';
      return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Bu işlem, aşağıda planladığınız görevlerden biri mi? Seçerseniz o görev
            <b className="text-text-primary"> “yapıldı”</b> olarak işaretlenir ve ayrı bir kayıt oluşturulmaz.
          </p>
          {matchingPlans.map((p) => {
            const isSel = wizardData.linkedPlanId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setStepData({ linkedPlanId: p.id }); nextStep(); }}
                className={`w-full text-left p-4 rounded-2xl border transition-all shadow-sm flex items-center gap-3 ${
                  isSel ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-extrabold text-text-primary truncate">{p.sub_type}</p>
                  <p className="text-[12px] text-text-secondary mt-0.5">Planlı: {fmtDate(p.scheduled_at)} • {fmtFreq(p)}</p>
                </div>
              </button>
            );
          })}
          <button
            onClick={() => { setStepData({ linkedPlanId: 'none' }); nextStep(); }}
            className={`w-full text-center p-3.5 rounded-2xl border border-dashed transition-all text-[13px] font-bold ${
              wizardData.linkedPlanId === 'none' ? 'border-slate-400 bg-slate-50 text-slate-700' : 'border-slate-300 text-slate-500 hover:bg-slate-50'
            }`}
          >
            Hayır, bu ekstra bir kayıt
          </button>
        </div>
      );
    }

    if (step.type === 'pet_selection') {
      return (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
          {pets.map(pet => {
            const isSelected = wizardData.pet_id === pet.id;
            return (
              <button
                key={pet.id}
                onClick={() => {
                  if (categoryKey === 'beslenme') {
                    router.replace(`/owner/pets/${pet.id}/nutrition`);
                    return;
                  }
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
      // Alt kategoriye özel alanı olmayan kombinasyonlarda kart boş kalmasın:
      // genel bir not alanı fallback olarak gösterilir (wizardData.notes → plans.note)
      const hasSpecificFields =
        subCat === 'Diğer' ||
        subCat === 'Belirti Takibi' ||
        subCat === 'Alerji' ||
        (categoryKey === 'saglik' && ['Tedavi/Pansuman', 'Tahlil/Rapor', 'Kronik Takip', 'İlaç'].includes(wizardData.subCategory || '')) ||
        categoryKey === 'beslenme';

      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {!hasSpecificFields && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-text-primary">Not / Detay</label>
              <textarea
                value={wizardData.notes || ''}
                onChange={(e) => setStepData({ notes: e.target.value })}
                placeholder="Planla ilgili eklemek istediğiniz detaylar (opsiyonel)..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-[13px] resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}
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
            ) : products.length === 0 ? (
              <p className="text-center text-[13px] text-text-secondary py-4">Bu pet için planlanabilir aktif protokol bulunmuyor.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(() => {
                  const displayProducts = [...products];
                  if (selectedProduct && selectedProduct.id !== 'other' && !products.some(p => p.id === selectedProduct.id)) {
                    displayProducts.unshift({
                      id: selectedProduct.id,
                      brand_name: selectedProduct.brand_name || 'Bilinmeyen Ürün',
                      product_name: selectedProduct.product_name || null,
                      category: selectedProduct.category || '',
                      duration_days: selectedProduct.duration_days ?? null
                    });
                  }
                  return displayProducts
                    .filter(p => selectedProduct === null || selectedProduct === undefined || selectedProduct?.id === p.id)
                    .map(product => {
                      const isSelected = selectedProduct?.id === product.id;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              // Seçimi kaldır
                              setStepData({
                                selectedProduct: null,
                                plannedProduct: null,
                                metadata: {
                                  ...wizardData.metadata,
                                  duration_days: undefined
                                }
                              });
                            } else {
                              // Ürünü seç — otomatik ilerleme yok, kullanıcı koruma süresini düzenleyebilsin.
                              // plannedProduct sıfırlanır: farklı protokole geçince eski katalog ürünü seçimi düşer.
                              setStepData({
                                selectedProduct: product,
                                plannedProduct: null,
                                metadata: {
                                  ...wizardData.metadata,
                                  duration_days: product.duration_days ?? null
                                }
                              });
                            }
                          }}
                          className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 border-primary' : 'bg-surface-1 border-border'}`}
                        >
                          <div>
                            <p className={`text-[13px] font-medium ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                              {product.brand_name} {product.product_name || ''}
                            </p>
                            {product.duration_days && !isSelected && (
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
                    });
                })()}
            
                {/* Diğer (Manuel): yalnızca DÜZENLEMEDE önceden kaydedilmiş eski
                    manuel seçim gösterilir. Yeni planda protokol EKLENEMEZ (protokoller
                    admin tarafından yönetilir); listede olmayan ÜRÜN, protokol seçildikten
                    sonra aşağıdaki "Kullanılacak Ürün" bölümünden girilir. */}
                {selectedProduct?.id === 'other' && (
                  <button
                    type="button"
                    onClick={() => setStepData({
                      selectedProduct: null,
                      plannedProduct: null,
                      metadata: { ...wizardData.metadata, duration_days: undefined }
                    })}
                    className="w-full p-3 rounded-xl border bg-primary/10 border-primary text-[13px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary">Diğer (Manuel)</span>
                      <Check size={16} className="text-primary flex-shrink-0" />
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Katalog ürünü seçici — seçili protokole uyumlu gerçek SKU'lar (opsiyonel).
                Protokol seçimini (extra_data.product.id) DEĞİŞTİRMEZ; yalnızca gösterim
                ve süre ön-doldurma için extra_data.planned_product'a snapshot yazılır. */}
            {selectedProduct && selectedProduct.id !== 'other' && (
              <div className="mt-1 pt-3 border-t border-border">
                <p className="text-[12px] font-black text-text-secondary uppercase tracking-wide mb-2">
                  Kullanılacak Ürün (Opsiyonel)
                </p>
                {catalogProductsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {catalogProducts.length === 0 ? (
                      <p className="text-[12px] text-text-secondary py-1">
                        Bu protokole uygun katalog ürünü bulunamadı — aşağıdan elle girebilirsiniz.
                      </p>
                    ) : (
                      catalogProducts.map(cp => {
                        const isSel = wizardData.plannedProduct?.id === cp.id;
                        return (
                          <button
                            key={cp.id}
                            type="button"
                            onClick={() => {
                              if (isSel) {
                                setStepData({
                                  plannedProduct: null,
                                  metadata: { ...wizardData.metadata, duration_days: selectedProduct.duration_days ?? null }
                                });
                              } else {
                                setStepData({
                                  plannedProduct: cp,
                                  metadata: {
                                    ...wizardData.metadata,
                                    duration_days: cp.protection_duration_days > 0 ? cp.protection_duration_days : (selectedProduct.duration_days ?? null)
                                  }
                                });
                              }
                            }}
                            className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${isSel ? 'bg-primary/10 border-primary' : 'bg-surface-1 border-border'}`}
                          >
                            <div>
                              <p className={`text-[13px] font-medium ${isSel ? 'text-primary' : 'text-text-primary'}`}>
                                {cp.brand} {cp.name}
                              </p>
                              <p className="text-[11px] text-text-muted mt-0.5">
                                {cp.protection_duration_days > 0 ? `${cp.protection_duration_days} gün etkili` : 'Tedavi ürünü'}
                              </p>
                            </div>
                            {isSel && <Check size={16} className="text-primary flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}

                    {/* Ürünüm listede yok — elle marka/ürün girişi (protokol seviyesinde
                        DEĞİL, ürün seviyesinde). parasite_product_id null olarak kaydedilir. */}
                    {(() => {
                      const isManual = wizardData.plannedProduct?.id === 'manual';
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (isManual) {
                                setStepData({ plannedProduct: null, metadata: { ...wizardData.metadata, duration_days: selectedProduct.duration_days ?? null } });
                              } else {
                                setStepData({ plannedProduct: { id: 'manual', brand: '', name: '', protection_duration_days: null }, metadata: { ...wizardData.metadata, duration_days: selectedProduct.duration_days ?? null } });
                              }
                            }}
                            className={`w-full p-3 rounded-xl border text-left transition-colors text-[13px] ${isManual ? 'bg-primary/10 border-primary' : 'border-dashed border-border text-text-secondary'}`}
                          >
                            {isManual ? (
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-primary">Ürünüm listede yok (elle giriş)</span>
                                <Check size={16} className="text-primary flex-shrink-0" />
                              </div>
                            ) : (
                              '+ Ürünüm listede yok, kendim gireceğim'
                            )}
                          </button>
                          {isManual && (
                            <div className="flex flex-col gap-2 mt-1">
                              <input
                                type="text"
                                placeholder="Marka (örn: Drontal)"
                                value={wizardData.plannedProduct?.brand || ''}
                                onChange={e => setStepData({ plannedProduct: { ...wizardData.plannedProduct, brand: e.target.value } })}
                                className="w-full p-3 border border-slate-200 rounded-xl text-[13px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Ürün adı (örn: Dog Tasty 10 kg)"
                                value={wizardData.plannedProduct?.name || ''}
                                onChange={e => setStepData({ plannedProduct: { ...wizardData.plannedProduct, name: e.target.value } })}
                                className="w-full p-3 border border-slate-200 rounded-xl text-[13px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                              <p className="text-[11px] text-text-muted">
                                Bu ürün ortak kataloğa admin onayından sonra eklenebilir; kaydınız hemen oluşur.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
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
              <p className="text-center text-[13px] text-text-secondary py-4">Bu pet için planlanabilir aktif protokol bulunmuyor.</p>
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
      
      const getRecurrenceText = () => {
        const val = wizardData.interval || 1;
        const freq = wizardData.frequency;
        if (freq === 'once') return 'Bu plan yalnızca bir kez gerçekleştirilecek.';
        
        const suffixMap: Record<string, string> = {
          hour: 'saatte',
          daily: 'günde',
          weekly: 'haftada',
          monthly: 'ayda',
          yearly: 'yılda'
        };
        
        const unitLabel = suffixMap[freq] || '';
        if (val === 1) {
          const singleLabel: Record<string, string> = {
            hour: 'saatlik (her saat)',
            daily: 'günlük (her gün)',
            weekly: 'haftalık (her hafta)',
            monthly: 'aylık (her ay)',
            yearly: 'yıllık (her yıl)'
          };
          return `Bu plan periyodik olarak ${singleLabel[freq] || unitLabel} tekrarlanacak.`;
        }
        return `Bu plan periyodik olarak her ${val} ${unitLabel} bir tekrarlanacak.`;
      };

      const unitOptions = [
        { value: 'hour', label: 'Saat' },
        { value: 'daily', label: 'Gün' },
        { value: 'weekly', label: 'Hft' },
        { value: 'monthly', label: 'Ay' },
        { value: 'yearly', label: 'Yıl' }
      ] as const;

      return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
          {/* Plan Tipi Seçimi */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">{logMode ? 'Bu işlem tekrar edecek mi?' : 'Plan Tipi'}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStepData({ frequency: 'once' })}
                className={`py-3 px-4 rounded-xl text-[13px] font-bold border transition-all text-center ${
                  wizardData.frequency === 'once'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {logMode ? 'Sadece bu kayıt' : 'Tek Seferlik'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (wizardData.frequency === 'once') {
                    setStepData({ frequency: 'daily', interval: 1 });
                  }
                }}
                className={`py-3 px-4 rounded-xl text-[13px] font-bold border transition-all text-center ${
                  wizardData.frequency !== 'once'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {logMode ? 'Tekrarlı yap (plan kur)' : 'Tekrarlı Plan'}
              </button>
            </div>
            {logMode && (
              <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                {wizardData.frequency === 'once'
                  ? 'Yalnızca bugünkü işlem kaydedilecek.'
                  : 'Bugünkü işlem kaydedilecek ve bir sonraki için tekrar planı oluşturulacak.'}
              </p>
            )}
          </div>

          {isRecurring && (
            <div className="flex flex-col gap-4 p-4 bg-surface border border-border-main rounded-2xl animate-in fade-in">
              {/* Stepper + Unit Seçimi */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-text-secondary">Tekrar Sıklığı</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <StepperInput
                    min={1} step={1}
                    value={wizardData.interval || 1}
                    onChange={(e) => setStepData({ interval: parseInt(e.target.value) || 1 })}
                    className="w-full sm:w-fit"
                  />
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[16px] w-full sm:w-auto">
                    {unitOptions.map(opt => {
                      const isSelected = wizardData.frequency === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStepData({ frequency: opt.value })}
                          className={`flex-1 sm:flex-none px-3.5 py-2 rounded-[12px] text-[12px] font-bold transition-all ${
                            isSelected 
                              ? 'bg-white text-slate-900 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bilgi Metni */}
              <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl p-3 flex items-start gap-2.5">
                <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[12px] font-medium text-indigo-700 leading-relaxed">
                  {getRecurrenceText()}
                </span>
              </div>

              {/* Bitiş Koşulu */}
              <div className="pt-4 border-t border-border-main space-y-3">
                <label className="text-[12px] font-bold text-text-secondary">Bitiş Koşulu</label>
                <div className="grid grid-cols-3 gap-2">
                  {END_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStepData({ endCondition: opt.value as any })}
                      className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition-all text-center ${
                        wizardData.endCondition === opt.value
                          ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {wizardData.endCondition === 'date' && (
                  <input
                    type="date"
                    min={wizardData.date}
                    value={wizardData.endDate || ''}
                    onChange={(e) => setStepData({ endDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                )}
                {wizardData.endCondition === 'occurrences' && (
                  <div className="flex items-center gap-2 mt-2">
                    <StepperInput
                      min={1} step={1}
                      value={wizardData.endOccurrences || 1}
                      onChange={(e) => setStepData({ endOccurrences: parseInt(e.target.value) || 1 })}
                      className="w-full sm:w-fit"
                    />
                    <span className="text-[12px] text-text-secondary font-normal">kez tekrarlandıktan sonra bitir</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step.type === 'medication_info') {
      const units = ['Tablet', 'Damla', 'Şurup (ml)', 'Kapsül', 'Merhem', 'Enjeksiyon'];
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-primary">İlaç Adı</label>
            <input
              type="text"
              value={wizardData.medication_name || ''}
              onChange={(e) => {
                const val = e.target.value;
                const capitalized = val.split(' ').map(word => 
                  word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR')
                ).join(' ');
                setStepData({ medication_name: capitalized });
              }}
              placeholder="Örn: Synulox, Nexgard..."
              className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-primary">Birim / Form</label>
            <div className="grid grid-cols-3 gap-2">
              {units.map(u => (
                <button
                  key={u}
                  onClick={() => setStepData({ medication_unit: u })}
                  className={`py-2 px-1 rounded-lg text-[12px] font-bold border transition-all text-center ${wizardData.medication_unit === u ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pt-2">
             <label className="text-[13px] font-bold text-text-primary flex items-center justify-between">
                İlaç Fotoğrafı <span className="text-[10px] text-text-tertiary font-normal px-2 py-0.5 bg-slate-100 rounded">Opsiyonel</span>
             </label>
             <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => document.getElementById('medPhoto')?.click()}>
               {wizardData.medication_photo_url ? (
                 <div className="flex flex-col items-center">
                    <img src={wizardData.medication_photo_url} alt="İlaç" className="w-16 h-16 object-cover rounded-lg mb-2 shadow-sm" />
                    <span className="text-indigo-600 font-bold text-[11px]">Fotoğraf Değiştir</span>
                 </div>
               ) : (
                 <>
                   <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-2 shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                   </div>
                   <p className="text-[11px] font-medium text-text-secondary">Paket fotoğrafı yüklemek için dokunun</p>
                 </>
               )}
               <input id="medPhoto" type="file" accept="image/*" className="hidden" 
                 onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if (!file) return;
                   const supabase = createBrowserSupabaseClient();
                   const ext = file.name.split('.').pop();
                   const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                   setStepData({ uploadingPhoto: true });
                   const { data, error } = await supabase.storage.from('medical_records').upload(`medications/${fileName}`, file);
                   setStepData({ uploadingPhoto: false });
                   if (!error && data) {
                     const { data: { publicUrl } } = supabase.storage.from('medical_records').getPublicUrl(data.path);
                     setStepData({ medication_photo_url: publicUrl });
                   } else {
                     alert("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
                   }
                 }}
               />
             </div>
             {wizardData.uploadingPhoto && <p className="text-[10px] font-bold text-indigo-500 text-center animate-pulse mt-1">Görsel yükleniyor, lütfen bekleyin...</p>}
          </div>
        </div>
      )
    }

    if (step.type === 'medication_purpose') {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-primary flex items-center justify-between">
                Kullanım Amacı <span className="text-[10px] text-text-tertiary font-normal px-2 py-0.5 bg-slate-100 rounded">Opsiyonel</span>
            </label>
            <input
              type="text"
              value={wizardData.medication_purpose || ''}
              onChange={(e) => setStepData({ medication_purpose: e.target.value })}
              placeholder="Örn: Enfeksiyon, Eklem desteği..."
              className="w-full p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>
        </div>
      )
    }

    if (step.type === 'medication_frequency') {
      const freqOptions = [
        { id: 'once_daily', label: 'Günde 1 kez' },
        { id: 'once_weekly', label: 'Haftada 1 kez' },
        { id: 'as_needed', label: 'Sadece gerektiğinde', desc: 'Hatırlatma kurulmaz, listeden manuel verilir.' }
      ];
      return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          {freqOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setStepData({ medication_freq_type: opt.id })}
              className={`w-full text-left p-4 rounded-xl border transition-all shadow-sm ${wizardData.medication_freq_type === opt.id ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 bg-surface hover:bg-slate-50'}`}
            >
              <p className={`text-[14px] font-extrabold ${wizardData.medication_freq_type === opt.id ? 'text-indigo-900' : 'text-text-primary'}`}>{opt.label}</p>
              {opt.desc && <p className="text-[11px] font-medium text-text-secondary mt-1">{opt.desc}</p>}
            </button>
          ))}
        </div>
      )
    }

    if (step.type === 'medication_datetime') {
      return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-2 gap-3">
             <div className="flex flex-col gap-1.5">
               <label className="text-[12px] font-bold text-text-primary">İlk Doz Tarihi</label>
               <input type="date" value={wizardData.date || new Date().toISOString().split('T')[0]} onChange={e => setStepData({ date: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-medium text-sm shadow-sm" />
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[12px] font-bold text-text-primary">Saat</label>
               <input type="time" value={wizardData.time || '09:00'} onChange={e => setStepData({ time: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-sm shadow-sm" />
             </div>
          </div>
          
          <div className="flex flex-col gap-1.5 pt-1">
             <label className="text-[12px] font-bold text-text-primary">Doz Miktarı</label>
             <div className="flex items-center gap-3">
                <StepperInput
                  min={0.1} step={0.1} unit={wizardData.medication_unit || 'Birim'}
                  value={wizardData.medication_dose || 1}
                  onChange={e => setStepData({ medication_dose: parseFloat(e.target.value) || 1 })}
                  className="w-full sm:w-fit border-indigo-200 focus-within:border-indigo-400"
                />
             </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-2">
             <label className="text-[12px] font-bold text-text-primary">Tedavi Süresi</label>
             <div className="flex items-center gap-3">
                <button onClick={() => setStepData({ medication_duration: 'continuous' })} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors shadow-sm ${wizardData.medication_duration === 'continuous' || !wizardData.medication_duration ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-surface text-slate-600 border-slate-200'}`}>Sürekli</button>
                <button onClick={() => setStepData({ medication_duration: 'days' })} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors shadow-sm ${wizardData.medication_duration === 'days' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-surface text-slate-600 border-slate-200'}`}>Belirli Gün</button>
             </div>
             {wizardData.medication_duration === 'days' && (
                <div className="flex items-center gap-3 mt-3 animate-in slide-in-from-top-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <StepperInput
                      min={1} step={1} unit="Gün"
                      value={wizardData.medication_days || 7}
                      onChange={e => setStepData({ medication_days: parseInt(e.target.value) })}
                   />
                </div>
             )}
          </div>
        </div>
      )
    }

    if (step.type === 'medication_stock') {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
           <div className="flex items-center justify-between p-4 bg-surface border border-border-main rounded-2xl shadow-sm">
            <div>
              <p className="text-[14px] font-extrabold text-text-primary">Stok Takibi</p>
              <p className="text-[11px] font-medium text-text-secondary mt-0.5">İlaç bitmeden size haber verelim</p>
            </div>
            <button onClick={() => setStepData({ medication_stock_enabled: !wizardData.medication_stock_enabled })} className={`w-12 h-7 rounded-full p-1 transition-colors ${wizardData.medication_stock_enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${wizardData.medication_stock_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          
          {wizardData.medication_stock_enabled && (
             <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                   <label className="text-[13px] font-extrabold text-indigo-900">Geçerli Stok</label>
                   <div className="flex items-center gap-2">
                      <StepperInput
                        min={1} step={1} unit={wizardData.medication_unit}
                        value={wizardData.medication_stock_count || 30}
                        onChange={e => setStepData({ medication_stock_count: parseInt(e.target.value) || 30 })}
                      />
                   </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-indigo-100">
                   <label className="text-[12px] font-bold text-slate-600 w-2/3">Kalan miktar şu seviyeye düşünce beni uyar:</label>
                   <div className="flex items-center gap-2">
                      <StepperInput
                        min={1} step={1} unit={wizardData.medication_unit}
                        value={wizardData.medication_alert_count || 10}
                        onChange={e => setStepData({ medication_alert_count: parseInt(e.target.value) || 10 })}
                      />
                   </div>
                </div>
             </div>
          )}
        </div>
      )
    }

    if (step.type === 'notification_selection') {
      const isPastDate = wizardData.date <= new Date().toISOString().split('T')[0];

      // İlişkilendirilmiş kayıt: yalnızca onay — mevcut planlı görev tamamlanır
      if (isLinked && linkedPlan) {
        const recurring = !!linkedPlan.repeat_rule;
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-4 bg-surface border border-border-main rounded-2xl">
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Planlı Görev</p>
              <p className="text-[15px] font-extrabold text-text-primary">{linkedPlan.sub_type}</p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                {(() => { try { return new Date(linkedPlan.scheduled_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' }); } catch { return ''; } })()}
                {recurring ? ` • Her ${linkedPlan.extra_data?.interval || 1} ${FREQ_LABEL[linkedPlan.repeat_rule] || ''}`.trimEnd() : ' • Tek seferlik'}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-emerald-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900 mb-0.5">Bu planlı görev tamamlanacak</p>
                <p className="text-[11px] text-emerald-700/80 leading-relaxed">
                  {recurring
                    ? '“Yapıldı” olarak işaretlenecek ve plan bir sonraki tarihe otomatik taşınacak. Ayrı bir kayıt oluşturulmaz.'
                    : '“Yapıldı” olarak işaretlenecek. Ayrı bir kayıt oluşturulmaz.'}
                </p>
              </div>
            </div>
          </div>
        );
      }

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

          {isPastDate && !logMode && (
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
          {logMode && (
             <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-emerald-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900 mb-0.5">Yapıldı olarak kaydedilecek</p>
                <p className="text-[11px] text-emerald-700/80 leading-relaxed">
                  {wizardData.frequency === 'once'
                    ? 'Bu işlem geçmişe dönük tamamlanmış kayıt olarak eklenecek.'
                    : 'Bu işlem tamamlanmış kayıt olarak eklenecek; ayrıca bir sonraki için tekrar planı oluşturulacak.'}
                </p>
              </div>
            </div>
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
            <h2 className="text-2xl font-black text-slate-900">{isLinked ? 'Görev Tamamlandı!' : isAllergy ? 'Alerji Kaydı Oluşturuldu!' : logMode ? 'Kayıt Eklendi!' : (isEditMode ? 'Rutin Güncellendi!' : 'Rutin Oluşturuldu!')}</h2>
            <p className="text-slate-500 text-sm mt-1">{petInfo?.name || 'Evcil hayvanınız'} için {isLinked ? (linkedPlan?.repeat_rule ? 'planlı görev yapıldı olarak işaretlendi ve bir sonraki tarihe taşındı' : 'planlı görev yapıldı olarak işaretlendi') : isAllergy ? 'alerji kaydı başarıyla oluşturuldu' : logMode ? (wizardData.frequency === 'once' ? 'işlem yapıldı olarak kaydedildi' : 'işlem kaydedildi ve tekrar planı oluşturuldu') : (isEditMode ? 'plan başarıyla güncellendi' : 'plan başarıyla kaydedildi')}.</p>
          </div>
          <div className="bg-surface rounded-3xl p-5 shadow-sm border border-border-main text-left space-y-3">
             {isLinked && linkedPlan ? (
               <>
                 <div className="flex justify-between items-start py-2 border-b border-slate-50">
                   <span className="text-[12px] font-semibold text-slate-400">Görev</span>
                   <span className="text-xs font-bold text-slate-800 text-right">{linkedPlan.sub_type}</span>
                 </div>
                 <div className="flex justify-between items-start py-2 border-b border-slate-50">
                   <span className="text-[12px] font-semibold text-slate-400">Durum</span>
                   <span className="text-xs font-bold text-emerald-600 text-right">Yapıldı ✓</span>
                 </div>
                 <div className="flex justify-between items-start py-2">
                   <span className="text-[12px] font-semibold text-slate-400">Tekrar</span>
                   <span className="text-xs font-bold text-slate-800 text-right">{linkedPlan.repeat_rule ? `Her ${linkedPlan.extra_data?.interval || 1} ${FREQ_LABEL[linkedPlan.repeat_rule] || ''}`.trimEnd() : 'Tek seferlik'}</span>
                 </div>
               </>
             ) : isAllergy ? (
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
             ) : subCat === 'İlaç' ? (
                <>
                  <div className="flex justify-between items-start py-2 border-b border-slate-50">
                    <span className="text-[12px] font-semibold text-slate-400">Görev</span>
                    <span className="text-xs font-bold text-slate-800 text-right">{wizardData.medication_name}</span>
                  </div>
                  <div className="flex justify-between items-start py-2 border-b border-slate-50">
                    <span className="text-[12px] font-semibold text-slate-400">Zaman</span>
                    <span className="text-xs font-bold text-slate-800 text-right">{wizardData.date} {wizardData.time}</span>
                  </div>
                  <div className="flex justify-between items-start py-2">
                    <span className="text-[12px] font-semibold text-slate-400">Tekrar</span>
                    <span className="text-xs font-bold text-slate-800 text-right">
                      {wizardData.medication_freq_type === 'once_daily' ? 'Günde 1 kez' :
                       wizardData.medication_freq_type === 'twice_daily' ? 'Günde 2 kez' :
                       wizardData.medication_freq_type === 'thrice_daily' ? 'Günde 3 kez' :
                       wizardData.medication_freq_type === 'four_times_daily' ? 'Günde 4 kez' :
                       wizardData.medication_freq_type === 'as_needed' ? 'Sadece gerektiğinde' : wizardData.medication_freq_type}
                    </span>
                  </div>
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
              router.push(logMode ? '/owner/plan-yap?mode=log' : '/owner/plan-yap')
            }}
            className="w-full py-3.5 rounded-2xl border border-primary text-primary font-semibold text-[16px] transition-all duration-300 hover:bg-primary/5 mb-3">
            {logMode ? 'Yeni Kayıt Ekle' : 'Planlama Yapmaya Devam Et'}
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
          if (!wizardData.selectedProduct) return 'Belirtilmedi';
          const protoLabel = wizardData.selectedProduct.product_name || wizardData.selectedProduct.brand_name;
          const pp = wizardData.plannedProduct;
          const ppText = pp ? [pp.brand, pp.name].filter((s: string) => s && s.trim()).join(' ') : '';
          return ppText ? `${protoLabel} • ${ppText}` : protoLabel;
        }
        return wizardData.selectedVaccine ? wizardData.selectedVaccine.name : 'Belirtilmedi';
      case 'metadata':
        if (subCat === 'Alerji') return wizardData.metadata?.trigger_name || 'Belirtilmedi';
        if (subCat === 'Belirti Takibi') return wizardData.metadata?.symptomNames?.join(', ') || 'Belirtilmedi';
        return 'Detay girildi';
      case 'link_plan':
        return wizardData.linkedPlanId === 'none'
          ? 'Yeni kayıt'
          : (linkedPlan ? `${linkedPlan.sub_type} planına bağlandı` : 'Belirtilmedi');
      case 'datetime':
        return wizardData.date ? `${wizardData.date} ${wizardData.time || ''}`.trim() : 'Belirtilmedi';
      case 'recurrence':
        return wizardData.frequency === 'once' ? 'Tek Seferlik' : `Her ${wizardData.interval || 1} ${FREQ_LABEL[wizardData.frequency] || wizardData.frequency}`;
      case 'medication_info':
        return wizardData.medication_name ? `${wizardData.medication_name} (${wizardData.medication_unit})` : 'Belirtilmedi';
      case 'medication_purpose':
        return wizardData.medication_purpose || 'Belirtilmedi';
      case 'medication_frequency':
        return wizardData.medication_freq_type === 'once_daily' ? 'Günde 1 kez' :
               wizardData.medication_freq_type === 'twice_daily' ? 'Günde 2 kez' :
               wizardData.medication_freq_type === 'thrice_daily' ? 'Günde 3 kez' :
               wizardData.medication_freq_type === 'four_times_daily' ? 'Günde 4 kez' :
               wizardData.medication_freq_type === 'as_needed' ? 'Sadece gerektiğinde' : 'Belirtilmedi';
      case 'medication_datetime':
        return wizardData.date ? `${wizardData.date} ${wizardData.time || ''}`.trim() : 'Belirtilmedi';
      case 'medication_stock':
        return wizardData.medication_stock_enabled ? `Aktif (${wizardData.medication_stock_count} adet)` : 'Kapalı';
      case 'notification':
        return wizardData.notificationEnabled ? `${wizardData.notificationMinutes} dk önce` : 'Kapalı';
      default:
        return 'Tamamlandı';
    }
  };

  return (
    <>
      {isEditMode && (
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
        submitText={isLinked ? 'Görevi Tamamla' : logMode ? 'Kaydı Ekle' : 'Planı Kaydet'}
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
        isNextDisabled={isEditMode ? isEditSaveDisabled : isNextDisabled}
        isSubmitting={isSubmitting}
        editAll={isEditMode}
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
