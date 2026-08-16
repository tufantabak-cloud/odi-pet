// NOT: Bu route `messages` modülünün bir parçası (registry.ts,
// status: 'hidden') ve middleware (`isBlockedPath`) tarafından 404'e
// düşürülüyor. Önceki içerik `supabase.from('messages').select('*').limit(5)`
// sonucunu -- `[id]` route parametresini hiç kullanmadan, katılımcı filtresi
// olmadan -- JSON.stringify ile döküyordu (messages özel DM içeriği
// taşıdığı için defense-in-depth amacıyla sorgu kaldırıldı).

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mesaj Detay</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}