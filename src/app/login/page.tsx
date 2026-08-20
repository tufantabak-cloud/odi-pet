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
import { Button, Input, Checkbox, GlassCard } from '@/components/ui/primitives'

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
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.refresh()
          router.push('/')
        }
      } catch {
        // Ignored: login form will render normally if session check fails
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
      const redirectTarget = searchParams.get('redirect')
      router.replace(redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/')
    } catch {
      setError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center p-4 bg-bg-main font-sans"
    >
      <div className="w-full max-w-md">
        <GlassCard padding="lg" className="sm:p-8 w-full relative overflow-hidden">

          {/* Mor üst şerit */}


          <div className={`p-2 sm:p-4 relative transition-all duration-700 ease-out ${success ? 'opacity-0 scale-95 blur-sm pointer-events-none' : ''}`}>

            {/* ── Logo & Başlık ── */}
            <div className="flex flex-col items-center mb-6">
              <Image src="/brand/app-icons/odi-icon-512.png" alt="Odi Logo" width={72} height={72} className="mb-2 h-10 w-10" priority />
              <p className="text-caption text-text-secondary font-medium">Can Dost Yaşam Platformu</p>
            </div>

            {/* ── Durum Bannerleri ── */}
            {banner && (
              <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-caption font-semibold text-center animate-in fade-in duration-300">
                <span>{banner.icon}</span>
                <p className="mt-1">{banner.text}</p>
              </div>
            )}

            {hasError && (
              <div role="alert" aria-live="assertive"
                className="mb-5 p-3.5 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-caption font-bold text-center animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-center gap-2">
                {/* Not: orijinal SVG kırmızı gradient + drop-shadow kullanıyordu — OPOS'ta bu efekt için
                    dokümante edilmiş bir gradient/shadow token yok, bu yüzden tek renkli danger token'ına
                    indirgendi (icat edilmiş bir görsel yerine mevcut token kullanıldı). */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="var(--color-danger)" />
                </svg>
                {error || urlMessage || errorParam}
              </div>
            )}

            {/* Turnstile */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={(token) => { setTurnstileToken(token); setValue('turnstileToken', token) }}
                options={{ action: 'login' }}
              />
            )}

            {/* ── Sosyal Giriş ── */}
            <div className="flex flex-col gap-3 mb-5">
              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={handleGoogleLogin}
                isLoading={googleLoading}
                disabled={googleLoading || appleLoading || loading}
                leftIcon={
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                }
              >
                Google ile Giriş Yap
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={handleAppleLogin}
                isLoading={appleLoading}
                disabled={googleLoading || appleLoading || loading}
                leftIcon={
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z"/>
                    <path d="M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                }
              >
                Apple ile Giriş Yap
              </Button>
            </div>
            {/* ── Ayraç ── */}
            <div className="relative flex items-center mb-5">
              <div className="flex-grow h-px bg-border" />
              <span className="mx-3 px-2 text-caption font-bold text-text-secondary/50 uppercase tracking-widest bg-transparent">veya</span>
              <div className="flex-grow h-px bg-border" />
            </div>

            {/* ── E-posta Formu ── */}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>

              <Input
                id="email"
                type="email"
                label="E-Posta"
                placeholder="E-posta Adresiniz"
                {...register('email')}
                autoComplete="email"
                data-testid="login-email-input"
                error={errors.email?.message}
              />

              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Şifre"
                placeholder="••••••••"
                {...register('password')}
                autoComplete="current-password"
                data-testid="login-password-input"
                error={errors.password?.message}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-primary transition-colors cursor-pointer -mr-2"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                <Checkbox label="Beni Hatırla" {...register('rememberMe')} />
                <Link href="/reset-password" className="text-body text-primary font-semibold hover:underline py-2">
                  Şifremi Unuttum?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={loading}
                disabled={!hydrated || loading || lockoutUntil !== null}
                data-testid="login-submit-button"
              >
                {loading ? 'Giriş yapılıyor…' : lockoutUntil !== null ? (
                  <span className="flex items-center gap-2">🔒 {lockoutRemaining} saniye bekleyin</span>
                ) : (
                  'Giriş Yap'
                )}
              </Button>

              <BiometricLogin />

            </form>

            {/* ── Kayıt linki ── */}
            <p className="text-center text-body text-text-secondary font-medium mt-6">
              Hesabınız yok mu?{' '}
              <Link href="/register" data-testid="register-link" className="font-semibold text-primary hover:underline">
                Kayıt Ol
              </Link>
            </p>

            {/* ── Güven ikonları ── */}
            <div className="flex items-center justify-center gap-5 mt-5 pt-5 border-t border-border/40">
              <span className="flex items-center gap-1.5 text-caption font-semibold text-text-secondary/60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                256-bit SSL
              </span>
              <span className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1.5 text-caption font-semibold text-text-secondary/60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                KVKK Uyumlu
              </span>
            </div>

          </div>

          {/* ── Başarılı Giriş Overlay ── */}
          {success && (
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 bg-surface/95 backdrop-blur-2xl rounded-card z-20">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-h2 font-bold text-text-primary">Hoş Geldiniz!</p>
              <p className="text-body text-text-secondary mt-1">Yönlendiriliyorsunuz…</p>
            </div>
          )}

        </GlassCard>
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
