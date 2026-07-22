import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import ContentAdminClient from './ContentAdminClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'İçerik Yönetimi | Odi.Pet Admin',
  description: 'Kişiselleştirilmiş içerik ve rehber yönetimi'
};

export default async function ContentAdminPage() {
  const supabase = await createServerSupabaseClient();
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-semibold">
          Bu alana erişmek için admin girişi yapmanız gerekmektedir.
        </div>
        <Link
          href="/login"
          className="inline-block bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl font-bold text-xs"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['admin', 'founder'].includes(profile.role)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold">
          Bu alan için admin veya founder yetkisi gereklidir. (Mevcut rolünüz: {profile?.role || 'tanımsız'})
        </div>
        <Link
          href="/owner/dashboard"
          className="inline-block bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl font-bold text-xs"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return <ContentAdminClient />;
}