// NOT: Bu route `registry.ts` içinde `status: 'hidden'` olarak işaretli ve
// middleware (`src/proxy.ts` -> `isBlockedPath`) tarafından 404'e düşürülüyor.
// Önceki içerik `supabase.from('messages').select('*').limit(5)` sonucunu
// sahiplik/katılımcı filtresi olmadan JSON.stringify ile döküyordu
// (messages RLS'i SELECT'i konuşma katılımcılarıyla sınırlar, ama bu tablo
// özel DM içeriği taşıdığı için defense-in-depth amacıyla sorgu tamamen
// kaldırıldı). Zaten var olan boş-durum tasarımı, gerçek Mesajlar ekranı
// yazılana kadar tek ve güvenli görünüm olarak korunuyor.

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mesajlar</h1>
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3 className="text-[18px] font-black text-text-primary mb-2">Henüz Mesajınız Yok</h3>
        <p className="text-[13px] text-text-secondary max-w-xs leading-relaxed">
          Veteriner veya hizmet sağlayıcılarla iletişiminiz burada görünecek.
        </p>
      </div>
    </div>
  );
}