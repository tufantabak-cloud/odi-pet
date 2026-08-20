'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Loader2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function BiometricLogin() {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkSupport() {
      try {
        if (
          typeof window !== 'undefined' &&
          window.PublicKeyCredential &&
          typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
        ) {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (isMounted) {
            setIsSupported(!!available);
          }
        } else {
          if (isMounted) {
            setIsSupported(false);
          }
        }
      } catch {
        if (isMounted) {
          setIsSupported(false);
        }
      }
    }

    checkSupport();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isSupported) {
    return null;
  }

  const handlePasskeyLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="w-full mt-3">
      <button
        type="button"
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl bg-white text-[13px] font-medium text-text-primary hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer shadow-xs"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <Fingerprint className="w-5 h-5 text-primary" />
        )}
        FaceID / TouchID ile Giriş Yap
      </button>
      {error && <p className="text-error text-[12px] font-bold mt-2 text-center" role="alert" aria-live="polite">{error}</p>}
    </div>
  );
}

