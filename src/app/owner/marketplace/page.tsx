// NOT: Bu route `registry.ts` içinde `status: 'hidden'` olarak işaretli ve
// middleware (`src/proxy.ts` -> `isBlockedPath`) tarafından 404'e düşürülüyor.
// Önceki içerik `supabase.from('marketplace_products').select('*').limit(5)`
// sonucunu sahiplik/erişim filtresi olmadan JSON.stringify ile döküyordu.
// Modül `registry.ts`'de canlıya alınmadan önce bu route her koşulda güvenli
// olsun diye sorgu tamamen kaldırıldı; gerçek Mağaza ekranı yazılana kadar
// yalnızca statik bir "yakında" yer tutucu gösterir.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mağaza</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}