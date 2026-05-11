'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const fd = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: fd
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Kayıt işlemi başarısız.')
        return
      }
      
      setSuccess(true)
    } catch (err) {
      setError('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main">
        <div className="w-full max-w-[400px] card-base p-10 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center text-success text-4xl mx-auto mb-6 shadow-inner shadow-success/20">
            ✓
          </div>
          <h2 className="text-[24px] font-black text-text-primary mb-3">Aramıza Hoş Geldiniz!</h2>
          <p className="text-[15px] text-text-secondary mb-8 leading-relaxed">
            Kayıt işleminiz başarıyla tamamlandı. Odi.Pet ile patili dostunuzun sağlığını artık profesyonelce takip edebilirsiniz.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="btn-primary w-full py-3.5 shadow-lg shadow-primary/30"
          >
            Giriş Sayfasına Git
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5">
      <div className="w-full max-w-[420px] card-base p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center justify-center w-24 h-24 rounded-[24px] overflow-hidden shadow-2xl shadow-primary/20 mb-6 hover:scale-105 transition-transform bg-white p-0.5">
            <Image 
              src="/logo.jpg" 
              alt="Odi Logo" 
              width={96} 
              height={96}
              className="w-full h-full object-cover rounded-[22px]"
              priority
            />
          </Link>
          <h1 className="text-[30px] font-black text-text-primary tracking-tighter">Yeni Hesap Oluştur</h1>
          <p className="text-[15px] font-bold text-text-secondary/80 mt-1 uppercase tracking-widest text-[10px]">Odi.Pet Ekosistemine Katılın</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in shake-in duration-300">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="name">
              Ad Soyad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Örn: Ahmet Yılmaz"
              required
              className="input-base py-3 text-[15px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="email">
              E-posta Adresi
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@email.com"
              required
              className="input-base py-3 text-[15px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="password">
              Güçlü Bir Şifre
            </label>
            <div className="relative group">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                className="input-base py-3 text-[15px] pr-12 w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-secondary hover:text-primary transition-colors"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 mt-1 px-1">
            <input type="checkbox" required id="terms" className="mt-1 w-4 h-4 rounded border-border-main text-primary focus:ring-primary" />
            <label htmlFor="terms" className="text-[12px] text-text-secondary leading-snug">
              <Link href="#" className="font-bold text-primary hover:underline">Kullanım Koşullarını</Link> ve <Link href="#" className="font-bold text-primary hover:underline">Gizlilik Politikası</Link>'nı okudum, onaylıyorum.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-4 py-4 text-[15px] font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Hesap Oluşturuluyor...
              </span>
            ) : 'Kayıt Ol ve Başla'}
          </button>

          <div className="text-center mt-6">
            <p className="text-[14px] text-text-secondary font-medium">
              Zaten bir hesabınız var mı?{' '}
              <Link href="/login" className="font-black text-primary hover:text-primary-hover hover:underline transition-all">
                Giriş Yapın
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
