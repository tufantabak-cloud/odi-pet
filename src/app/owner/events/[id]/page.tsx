// NOT: Bu route `events` modülünün bir parçası (registry.ts,
// status: 'hidden') ve middleware (`isBlockedPath`) tarafından 404'e
// düşürülüyor. Önceki içerik `supabase.from('events').select('*').limit(5)`
// sonucunu -- `[id]` route parametresini hiç kullanmadan -- JSON.stringify
// ile döküyordu (events tablosu herkese açık okunabilir olsa da,
// defense-in-depth için sorgu kaldırıldı).

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Etkinlik Detay</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}