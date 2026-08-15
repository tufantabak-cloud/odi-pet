// NOT: Bu route `registry.ts` içinde `status: 'hidden'` olarak işaretli ve
// middleware (`src/proxy.ts` -> `isBlockedPath`) tarafından 404'e düşürülüyor.
// Önceki içerik `supabase.from('bookings').select('*').limit(5)` sonucunu
// sahiplik filtresi olmadan JSON.stringify ile döküyordu (bookings RLS'i
// SELECT'i sahip/işletmeyle sınırlar, ama defense-in-depth için sorgu
// tamamen kaldırıldı). Gerçek Randevular ekranı yazılana kadar yalnızca
// statik bir "yakında" yer tutucu gösterir.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Randevular</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}