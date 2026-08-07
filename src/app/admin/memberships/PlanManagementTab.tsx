'use client';

import { useState, useTransition } from 'react';
import {
  Award,
  Plus,
  Edit,
  Copy,
  Archive,
  Eye,
  EyeOff,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  DollarSign,
  Shield,
  CreditCard,
  Check,
  X,
  FileText
} from 'lucide-react';
import { featureRegistry } from '@/lib/features/registry';
import type { FeatureDefinition } from '@/lib/features/types';
import {
  createPlanAction,
  updatePlanAction,
  archivePlanAction,
  duplicatePlanAction,
  toggleVisibilityAction,
  PlanFormData
} from './planActions';

interface PlanRecord {
  id: string;
  plan_key: string;
  plan_name: string;
  display_name: string | null;
  description: string | null;
  icon: string | null;
  accent_color: string | null;
  status: 'active' | 'draft' | 'archived' | 'disabled' | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string | null;
  billing_cycle: 'monthly' | 'quarterly' | 'annual' | null;
  trial_days: number | null;
  grace_days: number | null;
  visibility: 'public' | 'hidden' | 'draft' | null;
  sort_order: number | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  iyzico_plan_code: string | null;
  google_play_product_id: string | null;
  apple_product_id: string | null;
  upgrade_allowed: boolean | null;
  downgrade_allowed: boolean | null;
  created_at: string;
  updated_at: string;
  activeUsersCount?: number;
}

interface BundleRecord {
  key: string;
  label: string;
  description: string | null;
}

interface BundleFeatureRecord {
  bundle_key: string;
  feature_key: string;
}

interface Props {
  initialPlans: PlanRecord[];
  initialBundles?: BundleRecord[];
  initialPlanBundles?: { plan_key: string; bundle_key: string }[];
  initialBundleFeatures?: BundleFeatureRecord[];
  onRefresh?: () => void;
}

export default function PlanManagementTab({
  initialPlans,
  initialBundles = [],
  initialPlanBundles = [],
  initialBundleFeatures = [],
  onRefresh
}: Props) {
  const [plans, setPlans] = useState<PlanRecord[]>(initialPlans);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [billingFilter, setBillingFilter] = useState<string>('all');

  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);
  const [selectedPlanForPreview, setSelectedPlanForPreview] = useState<PlanRecord | null>(
    initialPlans.find((p) => p.status === 'active') || initialPlans[0] || null
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<PlanFormData>({
    plan_key: '',
    plan_name: '',
    display_name: '',
    description: '',
    icon: '⭐',
    accent_color: 'purple',
    status: 'active',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'TRY',
    billing_cycle: 'monthly',
    trial_days: 0,
    grace_days: 7,
    visibility: 'public',
    sort_order: 100,
    stripe_product_id: '',
    stripe_price_id_monthly: '',
    stripe_price_id_yearly: '',
    iyzico_plan_code: '',
    google_play_product_id: '',
    apple_product_id: '',
    upgrade_allowed: true,
    downgrade_allowed: true,
    bundle_keys: []
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Analytics Metrics
  const totalPlans = plans.length;
  const publishedCount = plans.filter((p) => (p.status === 'active' || !p.status) && p.visibility === 'public').length;
  const draftCount = plans.filter((p) => p.status === 'draft' || p.visibility === 'draft').length;
  const archivedCount = plans.filter((p) => p.status === 'archived').length;

  const validMonthlyPrices = plans
    .map((p) => Number(p.price_monthly ?? 0))
    .filter((price) => !isNaN(price) && price > 0);

  const avgPrice = validMonthlyPrices.length
    ? Math.round(validMonthlyPrices.reduce((a, b) => a + b, 0) / validMonthlyPrices.length)
    : 0;
  const highestPrice = validMonthlyPrices.length ? Math.max(...validMonthlyPrices) : 0;
  const lowestPrice = validMonthlyPrices.length ? Math.min(...validMonthlyPrices) : 0;

  // Registered features from Feature Registry
  const registeredFeatures: FeatureDefinition[] = Array.from(featureRegistry.values());

  // Filtered Plans
  const filteredPlans = plans.filter((plan) => {
    const nameMatch =
      (plan.display_name || plan.plan_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.plan_key.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'all' || plan.status === statusFilter;
    const visibilityMatch = visibilityFilter === 'all' || plan.visibility === visibilityFilter;
    const currencyMatch = currencyFilter === 'all' || plan.currency === currencyFilter;
    const billingMatch = billingFilter === 'all' || plan.billing_cycle === billingFilter;
    return nameMatch && statusMatch && visibilityMatch && currencyMatch && billingMatch;
  });

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      plan_key: '',
      plan_name: '',
      display_name: '',
      description: '',
      icon: '⭐',
      accent_color: 'purple',
      status: 'active',
      price_monthly: 0,
      price_yearly: 0,
      currency: 'TRY',
      billing_cycle: 'monthly',
      trial_days: 0,
      grace_days: 7,
      visibility: 'public',
      sort_order: 100,
      stripe_product_id: '',
      stripe_price_id_monthly: '',
      stripe_price_id_yearly: '',
      iyzico_plan_code: '',
      google_play_product_id: '',
      apple_product_id: '',
      upgrade_allowed: true,
      downgrade_allowed: true,
      bundle_keys: []
    });
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (plan: PlanRecord) => {
    setEditingPlan(plan);
    const assignedBundles = initialPlanBundles
      .filter((pb) => pb.plan_key === plan.plan_key)
      .map((pb) => pb.bundle_key);

    setFormData({
      id: plan.id,
      plan_key: plan.plan_key,
      plan_name: plan.plan_name,
      display_name: plan.display_name || plan.plan_name,
      description: plan.description || '',
      icon: plan.icon || '⭐',
      accent_color: plan.accent_color || 'purple',
      status: plan.status || 'active',
      price_monthly: plan.price_monthly ?? 0,
      price_yearly: plan.price_yearly ?? 0,
      currency: plan.currency || 'TRY',
      billing_cycle: plan.billing_cycle || 'monthly',
      trial_days: plan.trial_days ?? 0,
      grace_days: plan.grace_days ?? 7,
      visibility: plan.visibility || 'public',
      sort_order: plan.sort_order ?? 100,
      stripe_product_id: plan.stripe_product_id || '',
      stripe_price_id_monthly: plan.stripe_price_id_monthly || '',
      stripe_price_id_yearly: plan.stripe_price_id_yearly || '',
      iyzico_plan_code: plan.iyzico_plan_code || '',
      google_play_product_id: plan.google_play_product_id || '',
      apple_product_id: plan.apple_product_id || '',
      upgrade_allowed: plan.upgrade_allowed !== false,
      downgrade_allowed: plan.downgrade_allowed !== false,
      bundle_keys: assignedBundles
    });
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        if (editingPlan) {
          const updated = await updatePlanAction(editingPlan.id, formData);
          setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? { ...p, ...updated } : p)));
          setSelectedPlanForPreview((prev) => (prev?.id === editingPlan.id ? { ...prev, ...updated } : prev));
          showToast(`"${formData.display_name}" planı başarıyla güncellendi.`);
        } else {
          const created = await createPlanAction(formData);
          setPlans((prev) => [created, ...prev]);
          setSelectedPlanForPreview(created);
          showToast(`"${formData.display_name}" planı başarıyla oluşturuldu.`);
        }
        setModalOpen(false);
        onRefresh?.();
      } catch (err: any) {
        setErrorMessage(err.message || 'Bir hata oluştu.');
      }
    });
  };

  const handleDuplicate = async (plan: PlanRecord) => {
    startTransition(async () => {
      try {
        const dup = await duplicatePlanAction(plan.id);
        setPlans((prev) => [dup, ...prev]);
        showToast(`"${plan.display_name || plan.plan_name}" planı kopyalandı.`);
        onRefresh?.();
      } catch (err: any) {
        showToast(`Kopyalama hatası: ${err.message}`);
      }
    });
  };

  const handleArchive = async (plan: PlanRecord) => {
    if (!confirm(`"${plan.display_name || plan.plan_name}" planını arşivlemek istediğinize emin misiniz?`)) return;

    startTransition(async () => {
      try {
        const archived = await archivePlanAction(plan.id);
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...archived } : p)));
        showToast(`"${plan.display_name || plan.plan_name}" arşivlendi.`);
        onRefresh?.();
      } catch (err: any) {
        showToast(`Arşivleme hatası: ${err.message}`);
      }
    });
  };

  const handleToggleVisibility = async (plan: PlanRecord) => {
    const nextVis = plan.visibility === 'public' ? 'hidden' : 'public';
    startTransition(async () => {
      try {
        const updated = await toggleVisibilityAction(plan.id, nextVis);
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...updated } : p)));
        showToast(`Görünürlük "${nextVis === 'public' ? 'Açık' : 'Gizli'}" yapıldı.`);
        onRefresh?.();
      } catch (err: any) {
        showToast(`Hata: ${err.message}`);
      }
    });
  };

  // Helper to count features in assigned bundles
  const getPlanFeatureCount = (planKey: string) => {
    const assignedBundleKeys = initialPlanBundles
      .filter((pb) => pb.plan_key === planKey)
      .map((pb) => pb.bundle_key);

    const featureKeys = initialBundleFeatures
      .filter((bf) => assignedBundleKeys.includes(bf.bundle_key))
      .map((bf) => bf.feature_key);

    return new Set(featureKeys).size;
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-xl animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* 1. Analytics Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="card-base p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Toplam Plan</span>
          <span className="text-2xl font-black text-slate-900">{totalPlans}</span>
        </div>
        <div className="card-base p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Yayında</span>
          <span className="text-2xl font-black text-emerald-700">{publishedCount}</span>
        </div>
        <div className="card-base p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">Taslak</span>
          <span className="text-2xl font-black text-amber-700">{draftCount}</span>
        </div>
        <div className="card-base p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wider">Arşiv</span>
          <span className="text-2xl font-black text-rose-600">{archivedCount}</span>
        </div>
        <div className="card-base p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-extrabold text-purple-600 uppercase tracking-wider">Ort. Fiyat</span>
          <span className="text-2xl font-black text-purple-900">{avgPrice} ₺</span>
        </div>
        <div className="card-base p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">En Yüksek</span>
          <span className="text-2xl font-black text-slate-800">{highestPrice} ₺</span>
        </div>
        <div className="card-base p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">En Düşük</span>
          <span className="text-2xl font-black text-slate-800">{lowestPrice} ₺</span>
        </div>
      </div>

      {/* 2. Control Bar (Search, Filters, Create Button) */}
      <div className="card-base p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Plan adı veya anahtar kelime ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700"
          >
            <option value="all">Durum: Tümü</option>
            <option value="active">Aktif</option>
            <option value="draft">Taslak</option>
            <option value="archived">Arşivlenmiş</option>
            <option value="disabled">Devre Dışı</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700"
          >
            <option value="all">Görünürlük: Tümü</option>
            <option value="public">Herkese Açık</option>
            <option value="hidden">Gizli / Davet ile</option>
            <option value="draft">Taslak</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700"
          >
            <option value="all">Para Birimi: Tümü</option>
            <option value="TRY">₺ TRY</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-primary py-2.5 px-5 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Yeni Plan Oluştur
        </button>
      </div>

      {/* 3. Main Split View (Plan Cards List & Live Preview Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Plan Cards List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Abonelik Planları ({filteredPlans.length})
            </h3>
          </div>

          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              const isSelected = selectedPlanForPreview?.id === plan.id;
              const isArchived = plan.status === 'archived';

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanForPreview(plan)}
                  className={`card-base p-5 rounded-3xl bg-white border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : 'border-slate-100 hover:border-slate-300 shadow-xs'
                  } ${isArchived ? 'opacity-60 bg-slate-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                        {plan.icon || '⭐'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-slate-900">
                            {plan.display_name || plan.plan_name}
                          </h4>
                          <span className="font-mono text-2xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {plan.plan_key}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                              plan.status === 'active' || !plan.status
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : plan.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {plan.status || 'active'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                              plan.visibility === 'public'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {plan.visibility === 'public' ? 'Açık' : 'Gizli'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {plan.description || 'Açıklama belirtilmemiş.'}
                        </p>
                      </div>
                    </div>

                    {/* Price Badge */}
                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-slate-900">
                        {plan.price_monthly ?? 0} {plan.currency || '₺'} <span className="text-2xs font-normal text-slate-500">/ay</span>
                      </div>
                      <div className="text-2xs font-semibold text-slate-400">
                        Yıllık: {plan.price_yearly ?? 0} {plan.currency || '₺'}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap text-2xs font-semibold">
                      <span>⏱️ Deneme: {plan.trial_days ?? 0} gün</span>
                      <span>🛡️ Ek Süre: {plan.grace_days ?? 7} gün</span>
                      <span>📦 Paket Özellikleri: {getPlanFeatureCount(plan.plan_key)} adet</span>
                      {plan.stripe_product_id && <span className="text-purple-600 font-mono">⚡ Stripe Ready</span>}
                      {plan.iyzico_plan_code && <span className="text-blue-600 font-mono">💳 iyzico Ready</span>}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleVisibility(plan)}
                        title={plan.visibility === 'public' ? 'Gizle' : 'Yayınla'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                      >
                        {plan.visibility === 'public' ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(plan)}
                        title="Düzenle"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(plan)}
                        title="Kopyala"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(plan)}
                        title="Arşivle"
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPlans.length === 0 && (
              <div className="card-base p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-bold text-sm">Filtrelere uygun abonelik planı bulunamadı.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Customer Preview & Feature Summary */}
        <div className="space-y-6">
          {/* 1. Customer Live Preview Card */}
          <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Canlı Kullanıcı Kart Önizlemesi
              </span>
              <span className="text-2xs font-mono text-slate-400">Live Card View</span>
            </div>

            {selectedPlanForPreview ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-purple-950 text-white space-y-5 shadow-xl relative overflow-hidden border border-purple-900/50">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl">
                    {selectedPlanForPreview.icon || '⭐'}
                  </div>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full text-2xs font-bold uppercase">
                    {selectedPlanForPreview.plan_key}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black">{selectedPlanForPreview.display_name || selectedPlanForPreview.plan_name}</h3>
                  <p className="text-xs text-purple-200/80 mt-1">{selectedPlanForPreview.description || 'Evcil hayvanınız için tüm premium imkanlar.'}</p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-baseline gap-1">
                  <span className="text-3xl font-black">{selectedPlanForPreview.price_monthly ?? 0} {selectedPlanForPreview.currency || '₺'}</span>
                  <span className="text-xs text-purple-200">/ ay</span>
                </div>

                {(selectedPlanForPreview.trial_days ?? 0) > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-2xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    İlk {selectedPlanForPreview.trial_days} Gün Ücretsiz Deneme!
                  </div>
                )}

                <div className="space-y-2 pt-2 text-xs">
                  <span className="text-2xs font-bold text-purple-300 uppercase tracking-wider block">Dahil Olan Özellikler:</span>
                  <ul className="space-y-1.5">
                    {registeredFeatures.slice(0, 5).map((f) => (
                      <li key={f.key} className="flex items-center gap-2 text-purple-100">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Önizleme için soldan bir plan seçin.
              </div>
            )}
          </div>

          {/* 2. Read-Only Feature Registry Summary */}
          <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Feature Registry Katmanı (Read-Only)
            </h3>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
              {registeredFeatures.map((f) => (
                <div key={f.key} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">{f.name}</div>
                    <div className="text-2xs font-mono text-slate-400">{f.key}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-2xs font-extrabold uppercase">
                    {f.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-fadeIn border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                {editingPlan ? `Planı Düzenle: ${editingPlan.plan_key}` : 'Yeni Abonelik Planı Oluştur'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* General Settings */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">1. Genel Bilgiler</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Plan Anahtarı (Internal Key) *</label>
                    <input
                      type="text"
                      disabled={Boolean(editingPlan)}
                      value={formData.plan_key}
                      onChange={(e) => setFormData({ ...formData, plan_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="Örn: pro_plus"
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Görünür İsim (Display Name) *</label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value, plan_name: e.target.value })}
                      placeholder="Örn: Odi Pet Pro Plus"
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-2xs font-bold text-slate-700 block mb-1">Açıklama</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Plan detaylarını açıklayın..."
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">İkon</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Vurgu Rengi</label>
                    <select
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="purple">Mor (Purple)</option>
                      <option value="emerald">Yeşil (Emerald)</option>
                      <option value="blue">Mavi (Blue)</option>
                      <option value="amber">Turuncu (Amber)</option>
                      <option value="rose">Kırmızı (Rose)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Durum</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="active">Aktif</option>
                      <option value="draft">Taslak</option>
                      <option value="archived">Arşivlenmiş</option>
                      <option value="disabled">Devre Dışı</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Görünürlük</label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="public">Açık (Public)</option>
                      <option value="hidden">Gizli (Hidden)</option>
                      <option value="draft">Taslak (Draft)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing & Billing */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">2. Fiyatlandırma & Faturalandırma</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Aylık Fiyat *</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.price_monthly}
                      onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Yıllık Fiyat *</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.price_yearly}
                      onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Para Birimi</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="TRY">₺ TRY</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Deneme Süresi (Gün)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.trial_days}
                      onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Ek Tolerans Süresi (Grace Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.grace_days}
                      onChange={(e) => setFormData({ ...formData, grace_days: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Sıralama Önceliği</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 100 })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Future Provider Mapping Configuration */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">3. Gelecek Ödeme Altyapısı Konfigürasyonu (Provider Mapping)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Stripe Product ID</label>
                    <input
                      type="text"
                      placeholder="prod_..."
                      value={formData.stripe_product_id}
                      onChange={(e) => setFormData({ ...formData, stripe_product_id: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">iyzico Plan Kodu</label>
                    <input
                      type="text"
                      placeholder="iyz_plan_..."
                      value={formData.iyzico_plan_code}
                      onChange={(e) => setFormData({ ...formData, iyzico_plan_code: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Apple Product ID</label>
                    <input
                      type="text"
                      placeholder="com.odipet.pro"
                      value={formData.apple_product_id}
                      onChange={(e) => setFormData({ ...formData, apple_product_id: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">Google Play Product ID</label>
                    <input
                      type="text"
                      placeholder="odipet_pro_monthly"
                      value={formData.google_play_product_id}
                      onChange={(e) => setFormData({ ...formData, google_play_product_id: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bundle Assignments */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">4. Özellik Paketleri Ataması (Bundle Assignment)</h4>
                <div className="space-y-2">
                  {initialBundles.map((b) => {
                    const isChecked = (formData.bundle_keys || []).includes(b.key);
                    return (
                      <label key={b.key} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const keys = formData.bundle_keys || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, bundle_keys: [...keys, b.key] });
                            } else {
                              setFormData({ ...formData, bundle_keys: keys.filter((k) => k !== b.key) });
                            }
                          }}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{b.label} <span className="font-mono text-2xs text-slate-400">({b.key})</span></div>
                          <div className="text-2xs text-slate-500">{b.description || 'Paket içeriği'}</div>
                        </div>
                      </label>
                    );
                  })}
                  {initialBundles.length === 0 && (
                    <p className="text-xs text-slate-400">Tanımlı paket (bundle) bulunamadı.</p>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary px-6 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending ? 'Kaydediliyor...' : editingPlan ? 'Değişiklikleri Kaydet' : 'Planı Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
