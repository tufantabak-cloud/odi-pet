'use client';

import { useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export function BiometricSettingsRow({ initialHasPasskey }: { initialHasPasskey: boolean }) {
  const [hasPasskey, setHasPasskey] = useState(initialHasPasskey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegisterPasskey = async () => {
    setError(null);
    setLoading(true);
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
      
      setHasPasskey(true);
    } catch (err: any) {
      console.error('Passkey register error:', err);
      setError('Cihazınız biyometrik girişi desteklemiyor olabilir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 hover:bg-bg-main transition-colors flex justify-between items-center">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          <span className="font-semibold text-text-primary">Biyometrik (Şifresiz) Giriş</span>
        </div>
        {error && <span className="text-[11px] text-error font-medium mt-0.5">{error}</span>}
      </div>
      
      {hasPasskey ? (
        <span className="flex items-center gap-1 text-[12px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
          <span className="text-[10px]">✓</span> Aktif
        </span>
      ) : (
        <button
          type="button"
          onClick={handleRegisterPasskey}
          disabled={loading}
          className="text-[12px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            'Aktif Et'
          )}
        </button>
      )}
    </div>
  );
}
