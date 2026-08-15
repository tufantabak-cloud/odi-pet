// NOT: Bu route `registry.ts` içinde `sos-page` girdisinin `extraRoutes`
// kısmında `status: 'hidden'` işaretli ve middleware (`src/proxy.ts` ->
// `isBlockedPath`) tarafından 404'e düşürülüyor. Önceki içerik
// `supabase.from('pets').select('*').limit(5)` sonucunu -- `[id]` route
// parametresini hiç kullanmadan, sahiplik filtresi olmadan -- JSON.stringify
// ile döküyordu. Sorgu tamamen kaldırıldı; bkz. `src/app/sos/[id]/page.tsx`
// notu.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SOS Eşleşmeleri</h1>
      <p className="text-text-secondary text-sm">Bu bölüm henüz yapım aşamasında.</p>
    </div>
  );
}