import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ShieldCheck, FileText } from 'lucide-react';

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

  const { data: records, error } = await supabase.from('admin_audit_logs').select('*').limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-purple-600 shrink-0" />
          <span>Audit Logları</span>
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Yönetici işlemleri ve sistem güvenlik denetim izleri.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          Hata: {error.message}
        </div>
      )}

      <div className="space-y-3">
        {records && records.length > 0 ? (
          records.map((record: any) => (
            <div key={record.id} className="card-base rounded-3xl p-5 font-mono text-xs overflow-x-auto shadow-xs border border-border-main">
              <pre className="text-text-primary">{JSON.stringify(record, null, 2)}</pre>
            </div>
          ))
        ) : (
          <div className="card-base rounded-3xl p-12 text-center text-text-secondary">
            <FileText className="w-8 h-8 mx-auto mb-2 text-text-secondary opacity-50" />
            <p className="text-sm font-semibold">Henüz denetim kaydı bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}