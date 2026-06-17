"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ArrowLeft, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { use } from 'react';

export default function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadPlan() {
      const { data, error } = await supabase
        .from('plans')
        .select('*, pets(name)')
        .eq('id', id)
        .single();
        
      if (error) {
        setError('Plan bulunamadı.');
      } else {
        setPlan(data);
      }
      setLoading(false);
    }
    loadPlan();
  }, [id, supabase]);

  const handleDelete = async () => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silme başarısız');
      router.push('/owner/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h2 className="text-xl font-bold mb-4">{error || 'Bulunamadı'}</h2>
        <Link href="/owner/dashboard" className="px-6 py-3 bg-white rounded-xl shadow-sm font-bold text-primary">
          Panoya Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-12 md:pt-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-md mx-auto w-full">
        <div className="flex items-center mb-8">
          <button onClick={() => router.push('/owner/dashboard')} className="p-2 -ml-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900 ml-4">Plan Detayı</h1>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="mb-6">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Kategori</p>
            <p className="text-xl font-bold text-gray-800 capitalize">{plan.category}</p>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Evcil Hayvan</p>
            <p className="text-lg font-bold text-gray-800">{plan.pets?.name}</p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Seçilen Opsiyon</p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <p className="text-base font-semibold text-gray-700">{plan.extra_data?.option || 'Bilinmiyor'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Tekrar Kuralı</p>
            <p className="text-base text-gray-600 font-mono bg-gray-50 p-2 rounded-lg inline-block">
              {plan.repeat_rule || 'Tek Seferlik'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleDelete}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 p-4 bg-error/10 text-error font-bold rounded-2xl hover:bg-error/20 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          Planı İptal Et ve Sil
        </button>

      </div>
    </div>
  );
}
