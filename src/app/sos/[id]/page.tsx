// NOT: Bu route `registry.ts` içinde `sos-page` girdisi olarak
// `status: 'hidden'` işaretli ve middleware (`src/proxy.ts` ->
// `isBlockedPath`) tarafından 404'e düşürülüyor. `registry.ts`'in kendi
// notuna göre bu route "VERİ SIZDIRAN SCAFFOLD" olarak tanımlanmıştı:
// önceki içerik `supabase.from('pets').select('*').limit(5)` sonucunu --
// `[id]` route parametresini hiç kullanmadan, sahiplik filtresi olmadan --
// JSON.stringify ile döküyordu. Gerçek kayıp hayvan/paylaşım akışı zaten
// `/owner/lost-report` ve `/caregiver/[token]` üzerinden çalışıyor; bu route
// hiçbir yerden linklenmiyor. Sorgu tamamen kaldırıldı; route kalıcı olarak
// kapalı kalmalı (registry.ts notu: "silinmesi değerlendirilmeli").

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SOS Detay</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}