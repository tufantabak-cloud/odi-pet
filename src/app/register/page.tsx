'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/api/auth/callback`
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Google ile kayıt yapılamadı.')
      setGoogleLoading(false)
    }
  }

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
            Kayıt işleminiz başarıyla tamamlandı. E-posta adresinize bir doğrulama bağlantısı gönderildi. Lütfen giriş yapmadan önce gelen kutunuzu kontrol edin.
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

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="btn-base w-full py-3.5 bg-white border border-border-main text-text-primary font-bold shadow-sm hover:bg-bg-subtle transition-all flex items-center justify-center gap-3 disabled:opacity-60 rounded-[14px]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? 'Yönlendiriliyor...' : 'Google ile Devam Et'}
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border-main"></div>
              <span className="flex-shrink-0 mx-4 text-text-secondary/60 text-[12px] font-bold uppercase tracking-wider">veya</span>
              <div className="flex-grow border-t border-border-main"></div>
            </div>
          </div>

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
