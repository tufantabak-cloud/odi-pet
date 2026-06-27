import { useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
export function useAnalytics(eventName: string) {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.from('admin_audit_logs').select('*').limit(1).then(({ data }: { data: unknown }) => console.log('Analytics loaded', data));
  }, [eventName]);
}