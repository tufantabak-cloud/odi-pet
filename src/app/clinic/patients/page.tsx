// NOT: Bu route `clinic-portal` girdisinin bir parçası (registry.ts,
// status: 'hidden') ve middleware (`isBlockedPath`) tarafından 404'e
// düşürülüyor. Önceki içerik `supabase.from('pets').select('*').limit(5)`
// sonucunu klinik-pet ilişkisi filtresi olmadan JSON.stringify ile
// döküyordu. Sorgu kaldırıldı.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Hastalar</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}