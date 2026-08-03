'use client'
 
import { useEffect } from 'react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center p-4 bg-bg-main text-center font-sans">
      <div className="mb-6">
        <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center text-error text-4xl mx-auto shadow-inner shadow-error/20">
          ⚠️
        </div>
      </div>
      <h2 className="text-[24px] font-extrabold text-text-primary mb-4">Bir Sorun Oluştu</h2>
      <p className="text-base text-text-secondary mb-8 max-w-[400px]">
        Beklenmeyen bir hata meydana geldi. Sorunu çözmek için çalışıyoruz.
      </p>
      <button
        onClick={() => reset()}
        className="btn-primary py-3.5 px-8 shadow-lg shadow-primary/30 text-base"
      >
        Tekrar Dene
      </button>
    </div>
  )
}
