// NOT: Bu route admin/founder rol kontrolüyle korunuyor (src/proxy.ts), ama
// önceki içerik `supabase.from('subscription_plans').select('*').limit(5)`
// sonucunu filtresiz JSON.stringify ile dökerek defense-in-depth ilkesini
// ihlal ediyordu. Sorgu kaldırıldı.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Abonelik Planları</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}