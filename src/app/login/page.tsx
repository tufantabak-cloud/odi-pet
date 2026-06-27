'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import Loading from './loading'

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then(mod => mod.Turnstile), { ssr: false })
const BiometricLogin = dynamic(() => import('@/components/BiometricLogin').then(m => m.BiometricLogin), { ssr: false })

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlMessage = searchParams.get('message') ?? ''
  const reason = searchParams.get('reason') ?? ''
  const errorParam = searchParams.get('error') ?? ''
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0)

  useEffect(() => {
    if (lockoutUntil) {
      const updateRemaining = () => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
        if (remaining <= 0) {
          setLockoutUntil(null)
          setLockoutRemaining(0)
          setError('')
        } else {
          setLockoutRemaining(remaining)
        }
      }
      updateRemaining()
      const interval = setInterval(updateRemaining, 1000)
      return () => clearInterval(interval)
    }
  }, [lockoutUntil])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    setHydrated(true)
    const checkSession = async () => {
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.refresh()
        router.push('/')
      }
    }
    checkSession()
  }, [])

  const reasonBanner: Record<string, { icon: string; text: string }> = {
    admin_required: {
      icon: '🔒',
      text: 'Bu alana erişmek için yönetici veya kurucu yetkisi gereklidir. Lütfen yetkili hesabınızla giriş yapın.',
    },
    session_expired: {
      icon: '⏱️',
      text: 'Oturumunuzun süresi dolmuştur. Lütfen tekrar giriş yapın.',
    },
  }
  const banner = reasonBanner[reason] ?? null
  const hasError = !!(error || urlMessage || errorParam)

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) throw error
    } catch {
      setError('Google ile giriş yapılamadı. Lütfen tekrar deneyin.')
      setGoogleLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setAppleLoading(true)
    setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) throw error
    } catch {
      setError('Apple ile giriş yapılamadı. Lütfen tekrar deneyin.')
      setAppleLoading(false)
    }
  }

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    setError('')
    const fd = new FormData()
    fd.append('email', data.email)
    fd.append('password', data.password)
    fd.append('turnstileToken', turnstileToken)
    if (data.rememberMe) fd.append('rememberMe', 'true')
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', body: fd })
      const resData = await res.json()
      if (!res.ok) {
        if (resData.reset) setLockoutUntil(resData.reset)
        setError(resData.error || 'Giriş yapılamadı.')
        return
      }
      setSuccess(true)
      router.refresh()
      router.replace('/')
    } catch {
      setError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center p-4 pb-24 md:pb-4"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(79,45,186,0.07) 0%, #F8FAFC 65%)' }}
    >
      <div className="w-full max-w-sm relative">
        {/* Kart — relative zorunlu: success overlay absolute konumlanır */}
        <div className="relative bg-white rounded-[32px] shadow-2xl shadow-primary/10 border border-border-main/60 overflow-hidden">

          {/* Mor üst şerit */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-primary" />

          <div className={`p-7 sm:p-8 relative transition-all duration-700 ease-out ${success ? 'opacity-0 scale-95 blur-sm pointer-events-none' : ''}`}>

            {/* ── Logo & Başlık ── */}
            <div className="flex flex-col items-center gap-3 mb-7">
              <Link href="/" className="w-[68px] h-[68px] rounded-[20px] overflow-hidden shadow-lg shadow-primary/20 hover:scale-105 transition-transform border border-border-main/40">
                <Image src="/logo.webp" alt="Odi.Pet" width={68} height={68} className="w-full h-full object-cover" priority />
              </Link>
              <div className="text-center">
                <h1 className="text-[22px] font-black text-text-primary tracking-tighter leading-snug">
                  Sevgiyle Bak, Sağlıkla Büyüt
                </h1>
                <p className="text-[11px] font-black text-primary/70 mt-1 uppercase tracking-[0.18em]">
                  Hoş Geldiniz
                </p>
              </div>
            </div>

            {/* ── Durum Bannerleri ── */}
            {banner && (
              <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-semibold text-center animate-in fade-in duration-300">
                <span>{banner.icon}</span>
                <p className="mt-1">{banner.text}</p>
              </div>
            )}

            {hasError && (
              <div role="alert" aria-live="assertive"
                className="mb-5 p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <defs>
                    <linearGradient id="errGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#B91C1C" />
                    </linearGradient>
                    <filter id="errShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#B91C1C" floodOpacity="0.4"/>
                    </filter>
                  </defs>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="url(#errGrad)" filter="url(#errShadow)" />
                </svg>
                {error || urlMessage || errorParam}
              </div>
            )}

            {/* Turnstile (görünmez) */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={(token) => { setTurnstileToken(token); setValue('turnstileToken', token) }}
                options={{ size: 'invisible' }}
              />
            )}

            {/* ── Sosyal Giriş ── */}
            <div className="flex flex-col gap-2.5 mb-5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || appleLoading || loading}
                className="w-full h-[50px] flex items-center justify-center gap-3 bg-white border border-border-main rounded-[14px] font-bold text-[14px] text-text-primary shadow-sm hover:bg-bg-main hover:border-primary/20 hover:scale-[1.01] active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {googleLoading
                  ? <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  : <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                }
                {googleLoading ? 'Bağlanıyor…' : 'Google ile Giriş Yap'}
              </button>

              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={googleLoading || appleLoading || loading}
                className="w-full h-[50px] flex items-center justify-center gap-3 bg-[#050505] rounded-[14px] font-bold text-[14px] text-white shadow-sm hover:bg-black/85 hover:scale-[1.01] active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {appleLoading
                  ? <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  : <svg className="w-6 h-6 shrink-0" viewBox="0 0 384 512" fill="currentColor">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                    </svg>
                }
                {appleLoading ? 'Bağlanıyor…' : 'Apple ile Giriş Yap'}
              </button>
            </div>

            {/* ── Ayraç ── */}
            <div className="relative flex items-center mb-5">
              <div className="flex-grow h-px bg-border-main" />
              <span className="mx-3 px-2 text-[11px] font-black text-text-secondary/50 uppercase tracking-widest bg-white">veya</span>
              <div className="flex-grow h-px bg-border-main" />
            </div>

            {/* ── E-posta Formu ── */}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[11px] font-black text-text-secondary uppercase tracking-wider">
                  E-Posta
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="E-posta Adresiniz"
                  {...register('email')}
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className={`input-base h-[50px] text-[15px] ${errors.email ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
                />
                {errors.email && <span role="alert" className="text-error text-[11px] font-bold">{errors.email.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[11px] font-black text-text-secondary uppercase tracking-wider">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className={`input-base h-[50px] text-[15px] pr-11 w-full ${errors.password ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <span role="alert" className="text-error text-[11px] font-bold">{errors.password.message}</span>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('rememberMe')}
                    className="w-4 h-4 rounded border-border-main text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-[13px] text-text-secondary font-medium select-none">Beni Hatırla</span>
                </label>
                <Link href="/reset-password" className="text-[13px] text-primary font-bold hover:underline py-2">
                  Şifremi Unuttum?
                </Link>
              </div>

              <button
                type="submit"
                disabled={!hydrated || loading || lockoutUntil !== null}
                className={`w-full h-[50px] rounded-btn font-black text-[15px] mt-1 disabled:opacity-60 flex items-center justify-center
                  ${lockoutUntil !== null
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed transition-all'
                    : 'btn-primary shadow-lg shadow-primary/20 hover:shadow-primary/40'
                  }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2.5">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Giriş yapılıyor…
                  </span>
                ) : lockoutUntil !== null ? (
                  <span className="flex items-center gap-2">🔒 {lockoutRemaining} saniye bekleyin</span>
                ) : (
                  'Giriş Yap'
                )}
              </button>

              <div className="min-h-[50px]">
                <BiometricLogin />
              </div>

            </form>

            {/* ── Kayıt linki ── */}
            <p className="text-center text-[14px] text-text-secondary font-medium mt-6">
              Hesabınız yok mu?{' '}
              <Link href="/register" className="font-black text-primary hover:underline">
                Kayıt Ol
              </Link>
            </p>

            {/* ── Güven ikonları ── */}
            <div className="flex items-center justify-center gap-5 mt-5 pt-5 border-t border-border-main/40">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary/60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                256-bit SSL
              </span>
              <span className="w-px h-3 bg-border-main" />
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary/60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                KVKK Uyumlu
              </span>
            </div>

          </div>

          {/* ── Başarılı Giriş Overlay ── */}
          {success && (
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 bg-white rounded-[32px] z-20">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-[22px] font-black text-text-primary">Hoş Geldiniz!</p>
              <p className="text-[13px] text-text-secondary mt-1">Yönlendiriliyorsunuz…</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  )
}
