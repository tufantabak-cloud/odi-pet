// NOT: Bu route `src/proxy.ts` içindeki admin/founder rol kontrolüyle
// korunuyor, ama önceki içerik `supabase.from('admin_audit_logs').select('*')`
// sonucunu ek bir filtre olmadan JSON.stringify ile dökerek defense-in-depth
// ilkesini ihlal ediyordu. Gerçek Audit Log ekranı (filtreleme, sayfalama)
// yazılana kadar sorgu kaldırıldı.
import { ShieldCheck, FileText } from 'lucide-react';

export default function Page() {
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

      <div className="card-base rounded-3xl p-12 text-center text-text-secondary">
        <FileText className="w-8 h-8 mx-auto mb-2 text-text-secondary opacity-50" />
        <p className="text-sm font-semibold">Bu bölüm henüz yapım aşamasında.</p>
      </div>
    </div>
  );
}