'use client'
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
      <body>
        <div className="flex min-h-dvh w-full flex-col items-center justify-center p-4 bg-gray-50 text-center font-sans">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-4xl mx-auto shadow-inner">
              ⚠️
            </div>
          </div>
          <h2 className="text-[24px] font-extrabold text-gray-900 mb-4">Kritik Bir Hata Oluştu</h2>
          <p className="text-[15px] text-gray-600 mb-8 max-w-[400px] mx-auto">
            Sistemsel bir hata meydana geldi. Sayfayı yenilemeyi deneyin.
          </p>
          <button
            onClick={() => reset()}
            className="bg-black text-white rounded-full py-3.5 px-8 font-bold shadow-lg text-[15px]"
          >
            Sayfayı Yenile
          </button>
        </div>
      </body>
    </html>
  )
}
