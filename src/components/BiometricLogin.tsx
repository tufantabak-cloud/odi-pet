'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export function BiometricLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            // @ts-ignore (Experimental types might not be fully up to date)
            experimental: {
              passkey: true,
            },
          },
        }
      );

      // @ts-ignore
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
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Fingerprint className="w-5 h-5 text-indigo-600" />
        )}
        <span>FaceID / TouchID ile Giriş Yap</span>
      </button>
      {error && <p className="text-red-500 text-sm mt-2 text-center" aria-live="polite">{error}</p>}
    </div>
  );
}
