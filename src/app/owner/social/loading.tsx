/**
 * /owner/social route-level Suspense fallback.
 *
 * Canonical 11 blok yerleşimini yansıtır — böylece içerik geldiğinde
 * layout shift olmaz. Blok 4 (Aktif İlanınız) koşullu olduğu için
 * iskelette yer almaz; Blok 7 (filtre paneli) varsayılan olarak kapalıdır.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 pb-32 w-full mx-auto animate-pulse" aria-busy="true" aria-label="Sosyal & Topluluk yükleniyor">
      <section className="flex flex-col gap-5">

        {/* BLOK 1 — Başlık + geri */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-slate-200/70 shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-5 w-40 bg-slate-200/70 rounded-lg" />
            <div className="h-3 w-56 bg-slate-200/50 rounded" />
          </div>
        </div>

        {/* BLOK 2 — Sekme anahtarı */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/60">
              <div className="w-4 h-4 rounded bg-slate-200/70" />
              <div className="h-2.5 w-16 bg-slate-200/70 rounded" />
            </div>
          ))}
        </div>

        {/* BLOK 3 — Sekme açıklaması */}
        <div className="min-h-[40px] flex items-center justify-center">
          <div className="h-3.5 w-72 max-w-full bg-slate-200/50 rounded" />
        </div>

        {/* BLOK 5 — CTA */}
        <div className="h-12 rounded-2xl bg-slate-200/70" />

        {/* BLOK 6 — Arama + filtre butonu */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-11 rounded-2xl bg-slate-200/60" />
          <div className="w-11 h-11 rounded-2xl bg-slate-200/60 shrink-0" />
        </div>

        {/* BLOK 8 — Hızlı filtre chip'leri */}
        <div className="flex items-center gap-2 overflow-hidden">
          {[72, 64, 56, 68, 80].map((w, i) => (
            <div key={i} className="h-10 rounded-2xl bg-slate-200/60 shrink-0" style={{ width: w }} />
          ))}
        </div>

        {/* BLOK 9 — Konum */}
        <div className="h-10 w-44 rounded-2xl bg-slate-200/60" />

        {/* BLOK 10 — Öne Çıkanlar (yatay şerit) */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1 min-h-[28px]">
            <div className="h-4 w-32 bg-slate-200/70 rounded" />
            <div className="h-3 w-20 bg-slate-200/50 rounded" />
          </div>
          <div className="flex gap-3.5 overflow-hidden pb-2 pt-1 -mx-1 px-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-[220px] sm:w-[260px] aspect-[3/4] rounded-3xl bg-slate-200/60 shrink-0" />
            ))}
          </div>
        </div>

        {/* BLOK 10 — Tüm İlanlar (grid) */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1 min-h-[28px]">
            <div className="h-4 w-28 bg-slate-200/70 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-3xl bg-white border border-slate-100 p-3 flex gap-3.5 items-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-200/60 shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 w-28 bg-slate-200/70 rounded" />
                  <div className="h-3 w-36 bg-slate-200/50 rounded" />
                  <div className="h-3 w-20 bg-slate-200/40 rounded" />
                  <div className="h-7 w-24 bg-slate-200/60 rounded-xl mt-1 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
