'use client';

import { useState, useEffect } from 'react';
import { Fingerprint, Loader2, X } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export function BiometricPrompt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('biometric_prompt_dismissed');
    if (!dismissed) {
      // Sadece 1.5 saniye sonra göster (Gözü yormasın)
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

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
            // @ts-ignore
            experimental: {
              passkey: true,
            },
          },
        }
      );

      // @ts-ignore
      const { data, error } = await supabase.auth.enrollPasskey();

      if (error) {
        throw error;
      }
      
      setSuccess(true);
      setTimeout(() => setVisible(false), 3000);

    } catch (err: any) {
      console.error('Passkey register error:', err);
      setError('Biyometrik kayıt başarısız oldu. Cihazınız desteklemiyor olabilir.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 bg-green-50 border border-green-200 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <Fingerprint className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h4 className="font-bold text-green-900 text-sm">Harika!</h4>
          <p className="text-green-700 text-xs">Biyometrik girişiniz başarıyla kaydedildi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-4">
      <button 
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
          <Fingerprint className="w-6 h-6 text-indigo-600" />
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
          className="w-full mt-2 btn-primary py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
          <span>Biyometrik Girişi Aktif Et</span>
        </button>
      </div>
    </div>
  );
}
