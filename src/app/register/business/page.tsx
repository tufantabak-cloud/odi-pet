// NOT: Bu route henüz yazılmamış bir B2B kayıt akışının yer tutucusu.
// Önceki içerik `supabase.from('business_profiles').select('*').limit(5)`
// sonucunu sahiplik filtresi olmadan JSON.stringify ile döküyordu. Sorgu
// kaldırıldı.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">İşletme Kayıt</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}