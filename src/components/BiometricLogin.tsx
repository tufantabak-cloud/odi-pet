'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Loader2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function BiometricLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();

      // @ts-ignore — WebAuthn/Passkey API is experimental in Supabase
      const { data, error } = await supabase.auth.signInWithWebAuthn();

      if (error) {
        throw error;
      }
      
      // Client-side router ile yönlendirme (full reload gereksiz)
      router.refresh();
      router.push('/owner');

    } catch (err: any) {
      console.error('Passkey login error:', err);
      setError('Biyometrik giriş başarısız oldu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-4">
      <button
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl bg-white text-[13px] font-medium text-text-primary active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <i className="ti ti-fingerprint text-[18px] text-primary" />
        )}
        FaceID / TouchID ile Giriş Yap
      </button>
      {error && <p className="text-error text-[12px] font-bold mt-2 text-center" role="alert" aria-live="polite">{error}</p>}
    </div>
  );
}
