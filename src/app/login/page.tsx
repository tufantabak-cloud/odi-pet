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
  const [error, setError]     = useState('')
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
  })

  useEffect(() => {
    setHydrated(true)
    const checkSession = async () => {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Google OAuth error:', err)
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
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Apple OAuth error:', err)
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
    if (data.rememberMe) {
      fd.append('rememberMe', 'true')
    }

    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', body: fd })
      const resData = await res.json()

      if (!res.ok) {
        if (resData.reset) {
          setLockoutUntil(resData.reset)
        }
        setError(resData.error || 'Giriş yapılamadı.')
        return
      }

      // Trigger success animation
      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        router.push('/')
      }, 800)
    } catch {
      setError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // Compute the display message: prefer inline error, then URL error param, then urlMessage
  const displayError = error || (errorParam === 'session_expired' ? '' : '') || urlMessage

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5">
      <div className="w-full max-w-sm bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-primary/5 relative z-10 border border-border-main/50 relative overflow-hidden group">
        <div className={`transition-all duration-700 ease-out ${success ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-tr-full -ml-12 -mb-12 transition-transform group-hover:scale-110 duration-700 pointer-events-none"></div>
          
          <svg className="absolute -top-6 -right-6 w-32 h-32 text-primary opacity-5 transform rotate-[25deg] pointer-events-none" viewBox="0 0 512 512" fill="currentColor">
            <path d="M226.5 92.9c14.3 73.1-.1 142-32.3 154s-85-30.4-99.3-103.5c-14.3-73.1 .1-142 32.3-154s85 30.4 99.3 103.5zm71.4 125c14.3-73.1-.1-142-32.3-154s-85-30.4-99.3-103.5c-14.3-73.1 .1-142 32.3-154s85 30.4 99.3 103.5zm84.4 76.2c33.2 41.3 22.3 95.8-24.3 121.7s-111.4 13.3-144.6-28-22.3-95.8 24.3-121.7s111.4-13.3 144.6 28zm103.5-35.3c-2.4 49-33 87.7-68.5 86.5s-62.1-41.9-59.7-90.8 33-87.7 68.5-86.5 62.1 41.9 59.7 90.8zM42.2 245.5C11.5 220-4.3 176.4 1.1 148.1s30.1-30.8 60.8-5.3 46.5 69.1 41.1 97.4-30.1 30.8-60.8 5.3z"/>
          </svg>

          <div className="text-center mb-10 relative">
          <Link href="/" className="inline-flex items-center justify-center w-24 h-24 rounded-[24px] overflow-hidden shadow-2xl shadow-primary/20 mb-6 hover:scale-105 transition-transform bg-white p-0.5">
            <Image 
              src="/logo.webp" 
              alt="Odi Logo" 
              width={96} 
              height={96}
              className="w-full h-full object-cover rounded-[22px]"
              priority
            />
          </Link>
          <h1 className="text-[28px] font-black text-text-primary tracking-tighter leading-tight">Sevgiyle Bak, <br/>Sağlıkla Büyüt</h1>
          <p className="text-[13px] font-black text-primary/80 mt-2 uppercase tracking-[0.2em]">Hoş Geldiniz</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => {
                setTurnstileToken(token)
                setValue('turnstileToken', token)
              }}
              options={{ size: 'invisible' }}
            />
          )}
          {banner && (
            <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-semibold text-center animate-in fade-in duration-300">
              <span className="text-[16px]">{banner.icon}</span>
              <p className="mt-1">{banner.text}</p>
            </div>
          )}

          {(error || urlMessage) && (
            <div role="alert" className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
              ⚠️ {error || urlMessage}
            </div>
          )}

          <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || appleLoading || loading}
              className="btn-base flex-1 py-3.5 bg-white border border-border-main text-text-primary font-bold shadow-sm hover:bg-bg-subtle hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 rounded-[14px]"
            >
              {googleLoading ? (
                <svg className="animate-spin w-5 h-5 text-text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {googleLoading ? 'Bağlanıyor...' : 'Google'}
            </button>

            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={googleLoading || appleLoading || loading}
              className="btn-base flex-1 py-3.5 bg-black text-white border border-black font-bold shadow-sm hover:bg-black/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 rounded-[14px]"
            >
              {appleLoading ? (
                <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
              )}
              {appleLoading ? 'Bağlanıyor...' : 'Apple'}
            </button>
          </div>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t-2 border-border-main"></div>
              <span className="flex-shrink-0 mx-4 text-text-secondary font-black text-[11px] uppercase tracking-widest px-3 py-1 bg-white rounded-full shadow-sm border border-border-main">veya</span>
              <div className="flex-grow border-t-2 border-border-main"></div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="email">
              E-posta Adresi
            </label>
            <input
              id="email"
              type="email"
              placeholder="ornek@email.com"
              {...register('email')}
              autoComplete="email"
              className={`input-base py-3 text-[15px] ${errors.email ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
            />
            {errors.email && <span role="alert" className="text-error text-[11px] font-bold ml-1">{errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider" htmlFor="password">
                Şifre
              </label>
              <Link href="/reset-password" className="text-[12px] font-bold text-primary hover:text-primary-hover transition-colors">
                Şifremi Unuttum
              </Link>
            </div>
            <div className="relative group">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                autoComplete="current-password"
                className={`input-base py-3 text-[15px] pr-12 w-full ${errors.password ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-secondary hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <span role="alert" className="text-error text-[11px] font-bold ml-1">{errors.password.message}</span>}
          </div>

          <div className="flex items-center gap-2 ml-1">
            <input
              id="rememberMe"
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded-[4px] border-border-main text-primary focus:ring-primary/20 transition-all cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-[13px] font-bold text-text-secondary cursor-pointer select-none">
              Beni Hatırla
            </label>
          </div>

          <button
            type="submit"
            disabled={!hydrated || loading || lockoutUntil !== null}
            className={`btn-primary w-full mt-4 py-4 text-[15px] font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 transition-all ${lockoutUntil === null ? 'hover:scale-[1.02] active:scale-[0.98]' : 'bg-bg-subtle text-text-secondary border-border-main shadow-none cursor-not-allowed'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Giriş yapılıyor…
              </span>
            ) : lockoutUntil !== null ? (
              <span className="flex items-center justify-center gap-2">
                🔒 {lockoutRemaining} saniye bekleyin
              </span>
            ) : 'Giriş Yap'}
          </button>

          <BiometricLogin />

          <div className="text-center mt-6">
            <p className="text-[14px] text-text-secondary font-medium">
              Henüz hesabınız yok mu?{' '}
              <Link href="/register" className="font-black text-primary hover:text-primary-hover hover:underline transition-all">
                Hemen Kayıt Olun
              </Link>
            </p>
            <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border-main/50 text-[11px] font-bold text-text-secondary/70">
              <span className="flex items-center gap-1.5"><span className="text-[14px]">🔒</span> 256-bit SSL Koruması</span>
              <span className="flex items-center gap-1.5"><span className="text-[14px]">🛡️</span> KVKK Uyumlu</span>
            </div>
          </div>
        </form>
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
