'use client';

import { useState, useEffect } from 'react';
import { Fingerprint, Loader2, X } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export function BiometricPrompt({ forceOpen = false }: { forceOpen?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkSupportAndShow() {
      try {
        if (
          typeof window === 'undefined' ||
          !window.PublicKeyCredential ||
          typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
        ) {
          return;
        }
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available || !isMounted) return;

        if (forceOpen) {
          setVisible(true);
          return;
        }
        const dismissed = localStorage.getItem('biometric_prompt_dismissed');
        if (!dismissed) {
          const timer = setTimeout(() => {
            if (isMounted) setVisible(true);
          }, 1500);
          return () => clearTimeout(timer);
        }
      } catch {
        // Platform authenticator not available
      }
    }
    checkSupportAndShow();
    return () => {
      isMounted = false;
    };
  }, [forceOpen]);

  const dismiss = () => {
    localStorage.setItem('biometric_prompt_dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const handleRegisterPasskey = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            // @ts-expect-error - Passkey is an experimental Supabase features
            experimental: {
              passkey: true,
            },
          },
        }
      );

      // @ts-expect-error - enrollPasskey is part of experimental auth features
      const { error } = await supabase.auth.enrollPasskey();

      if (error) {
        throw error;
      }
      
      setSuccess(true);
      setTimeout(() => setVisible(false), 3000);

    } catch (err: unknown) {
      console.error('Passkey register error:', err);
      setError('Biyometrik kayıt başarısız oldu. Cihazınız desteklemiyor olabilir.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed bottom-28 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 bg-green-50 border border-green-200 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-28 md:slide-in-from-bottom-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#22C55E] to-[#4ADE80] flex items-center justify-center shrink-0 shadow-md shadow-success/20">
          <Fingerprint className="w-6 h-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]" />
        </div>
        <div>
          <h4 className="font-bold text-green-900 text-sm">Harika!</h4>
          <p className="text-green-700 text-xs">Biyometrik girişiniz başarıyla kaydedildi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-28 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-28 md:slide-in-from-bottom-4">
      <button 
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6D3DF5] to-[#E05397] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-[1.1] transition-transform duration-300">
          <Fingerprint className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
        </div>
        <div>
          <h3 className="font-black text-gray-900">Şifresiz Girişi Açın</h3>
          <p className="text-sm text-gray-500 mt-1">
            Sonraki girişlerinizde FaceID veya TouchID kullanarak çok daha hızlı ve güvenli giriş yapabilirsiniz.
          </p>
        </div>
        
        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          onClick={handleRegisterPasskey}
          disabled={loading}
          className="w-full mt-3 bg-gradient-to-r from-[#6D3DF5] to-[#E05397] hover:from-[#4E24C8] hover:to-[#C03E7E] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
          <span>Biyometrik Girişi Aktif Et</span>
        </button>
      </div>
    </div>
  );
}
