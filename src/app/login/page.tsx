'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import Loading from './loading'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { AppleIcon } from '@/components/icons/AppleIcon'

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
  const [capsLockOn, setCapsLockOn] = useState(false)
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

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (success) {
      timer = setTimeout(() => {
        router.refresh()
        router.push('/')
      }, 200)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [success, router])

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
    } catch {
      setError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5">
      <div className="w-full max-w-sm bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-primary/5 relative z-10 border border-border-main/50 overflow-hidden group">
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
                <GoogleIcon className="w-5 h-5" />
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
                <AppleIcon className="w-5 h-5" />
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
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                {...register('email')}
                autoComplete="email"
                className={`input-base py-3 text-[15px] w-full ${errors.email ? 'border-error/50 focus:border-error focus:ring-error/20 pr-10' : ''}`}
              />
              {errors.email && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-error">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
            </div>
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
                onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                autoComplete="current-password"
                className={`input-base py-3 text-[15px] w-full ${errors.password ? 'border-error/50 focus:border-error focus:ring-error/20 pr-20' : 'pr-12'}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {errors.password && (
                  <div className="pointer-events-none text-error mr-1">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  className="p-1 text-text-secondary hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {capsLockOn && <span className="text-amber-600 text-[11px] font-bold ml-1 flex items-center gap-1">⚠️ Caps Lock açık</span>}
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
