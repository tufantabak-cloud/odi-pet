// NOT: Bu route `registry.ts` içinde `clinic-portal` girdisinin bir parçası
// olarak `status: 'hidden'` işaretli ve middleware (`src/proxy.ts` ->
// `isBlockedPath`) tarafından 404'e düşürülüyor. Önceki içerik
// `supabase.from('pets').select('*').limit(5)` sonucunu -- `[petId]` route
// parametresini hiç kullanmadan, sahiplik/klinik ilişkisi filtresi olmadan --
// JSON.stringify ile döküyordu. Gerçek Hasta Detay ekranı (klinik-pet
// yetkilendirmesiyle) yazılana kadar sorgu tamamen kaldırıldı.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Hasta Detay</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}