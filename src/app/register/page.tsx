'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Simüle edilmiş kayıt süreci (UX demosu)
    setTimeout(() => {
      setSuccess(true)
      setLoading(false)
    }, 1500)
  }

  if (success) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main">
        <div className="w-full max-w-[400px] card-base p-8 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-[22px] font-bold text-text-primary mb-2">Aramıza Hoş Geldiniz!</h2>
          <p className="text-[14px] text-text-secondary mb-6">
            Kayıt işleminiz başarıyla tamamlandı. Odi.Pet ayrıcalıklarını keşfetmeye hazırsınız.
          </p>
          <Link href="/login" className="btn-primary w-full inline-block text-center py-3">
            Giriş Sayfasına Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main">
      <div className="w-full max-w-[400px] card-base p-8 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/30 text-white font-extrabold text-xl mb-4 select-none">
            Odi
          </div>
          <h1 className="text-[28px] font-bold text-text-primary tracking-tight">Kayıt Ol</h1>
          <p className="text-[15px] font-medium text-text-primary/70 mt-1">Siz ve patili dostunuz için</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-[12px] bg-error/10 border border-error/20 text-error text-[13px] font-semibold text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text-primary" htmlFor="name">
              Ad Soyad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Adınız Soyadınız"
              required
              className="input-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text-primary" htmlFor="email">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@email.com"
              required
              className="input-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-text-primary" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="input-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-4 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Hesap Oluşturuluyor...
              </span>
            ) : 'Kayıt Ol'}
          </button>

          <div className="text-center mt-4">
            <p className="text-[14px] text-text-secondary">
              Zaten hesabınız var mı?{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-primary-hover transition-colors">
                Giriş Yapın
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
