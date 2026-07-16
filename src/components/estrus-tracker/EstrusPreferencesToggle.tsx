import { useState, useEffect } from 'react';

export function EstrusPreferencesToggle({ petId }: { petId: string }) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/pets/${petId}/estrus-preferences`);
        if (!res.ok) throw new Error('Yüklenemedi');
        const data = await res.json();
        setEnabled(data.reminders_enabled ?? true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [petId]);

  const handleToggle = async () => {
    if (updating) return;
    const prev = enabled;
    setEnabled(!prev);
    setUpdating(true);
    
    try {
      const res = await fetch(`/api/pets/${petId}/estrus-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminders_enabled: !prev })
      });
      if (!res.ok) throw new Error('Kaydedilemedi');
    } catch (err: any) {
      console.error(err);
      setEnabled(prev); // rollback
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="animate-pulse h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl"></div>;

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-700/50 flex flex-row items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Kızgınlık hatırlatmaları</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tahmini dönem yaklaşırken veya açık bıraktığınız bir dönemi kontrol etmeniz gerektiğinde bildirim alın.</p>
      </div>
      <div className="flex items-center min-h-[44px] min-w-[44px] justify-center">
        <button 
          onClick={handleToggle}
          disabled={updating}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50
            ${enabled ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-600'}`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>
    </div>
  );
}
