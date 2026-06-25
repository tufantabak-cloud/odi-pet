import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: records, error } = await supabase.from('messages').select('*').limit(5);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mesajlar</h1>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      <ul className="space-y-2">
        {records && records.length > 0 ? (
          records.map((record: any) => (
            <li key={record.id} className="p-4 bg-white rounded shadow text-sm">
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </li>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="text-[18px] font-black text-text-primary mb-2">Henüz Mesajınız Yok</h3>
            <p className="text-[13px] text-text-secondary max-w-xs leading-relaxed">
              Veteriner veya hizmet sağlayıcılarla iletişiminiz burada görünecek.
            </p>
          </div>
        )}
      </ul>
    </div>
  );
}