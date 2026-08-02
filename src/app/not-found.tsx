import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 text-center font-sans">
      <div className="mb-6">
        <Image src="/brand/app-icons/odi-icon-512.png" alt="Odi.Pet Logo" width={80} height={80} className="rounded-[20px] shadow-lg shadow-primary/20 mx-auto mb-4" />
      </div>
      <h1 className="text-[120px] font-black text-primary leading-none tracking-tighter mb-2">404</h1>
      <h2 className="text-[24px] font-extrabold text-text-primary mb-4">Sayfa Bulunamadı</h2>
      <p className="text-[15px] text-text-secondary mb-8 max-w-[400px]">
        Aradığınız sayfayı bulamadık. Sayfa kaldırılmış, adı değiştirilmiş veya geçici olarak kullanılamıyor olabilir.
      </p>
      <Link href="/" className="btn-primary py-3.5 px-8 shadow-lg shadow-primary/30 text-[15px] inline-flex">
        Ana Sayfaya Dön
      </Link>
    </div>
  )
}
