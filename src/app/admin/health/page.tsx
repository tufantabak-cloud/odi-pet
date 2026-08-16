// NOT: Bu route admin/founder rol kontrolüyle korunuyor (src/proxy.ts), ama
// önceki içerik `supabase.from('admin_audit_logs').select('*').limit(5)`
// sonucunu (yanlışlıkla bu sayfanın konusuyla alakasız bir tablodan)
// filtresiz JSON.stringify ile dökerek defense-in-depth ilkesini ihlal
// ediyordu. Sorgu kaldırıldı.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sistem Sağlığı</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}