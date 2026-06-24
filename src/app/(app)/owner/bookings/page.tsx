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

  const { data: records, error } = await supabase.from('bookings').select('*').limit(5);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Randevular</h1>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      <ul className="space-y-2">
        {records && records.length > 0 ? (
          records.map((record: any) => (
            <li key={record.id} className="p-4 bg-white rounded shadow text-sm">
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </li>
          ))
        ) : (
          <p>Kayıt bulunamadı.</p>
        )}
      </ul>
    </div>
  );
}