// NOT: Bu route `sitter` modülünün bir parçası (registry.ts,
// status: 'skeleton') ve middleware (`isBlockedPath`) tarafından 404'e
// düşürülüyor. Önceki içerik `supabase.from('business_profiles').select('*')`
// sonucunu sahiplik filtresi olmadan JSON.stringify ile döküyordu. Sorgu
// kaldırıldı.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Bakıcı Dashboard</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}