"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    async function redirectPlan() {
      const { data, error } = await supabase
        .from('plans')
        .select('category')
        .eq('id', id)
        .single();
        
      if (error || !data) {
        setError('Plan bulunamadı.');
      } else {
        // Doğrudan plan-yap wizardına edit moduyla yönlendir
        router.replace(`/owner/plan-yap/${data.category}?editId=${id}`);
      }
    }
    redirectPlan();
  }, [id, router, supabase]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-4">{error}</h2>
        <Link href="/owner/dashboard" className="px-6 py-3 bg-white rounded-xl shadow-sm font-bold text-indigo-600">
          Panoya Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
      <p className="text-sm text-slate-500 font-medium animate-pulse">Düzenleyici hazırlanıyor...</p>
    </div>
  );
}
