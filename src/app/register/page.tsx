'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then(mod => mod.Turnstile), { ssr: false })

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, color: 'bg-border-main', text: '' }
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score, color: 'bg-error', text: 'Zayıf' }
  if (score === 2) return { score, color: 'bg-warning', text: 'Orta' }
  if (score >= 3) return { score, color: 'bg-success', text: 'Güçlü' }
  return { score: 0, color: 'bg-border-main', text: '' }
}

const strengthTextColors: Record<number, string> = {
  1: 'text-error',
  2: 'text-warning',
  3: 'text-success',
  4: 'text-success',
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showTurnstile, setShowTurnstile] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [step, setStep] = useState(1)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    setFocus,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const handleNextStep = async () => {
    const isStep1Valid = await trigger(['name', 'email'])
    if (isStep1Valid) {
      setStep(2)
      setTimeout(() => setFocus('password'), 300)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    try {
      const email = watch('email')
      if (!email) return

      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        }
      })
      if (error) throw error
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (err) {
      console.error(err)
    } finally {
      setResendLoading(false)
    }
  }

  const passwordValue = watch('password') || ''
  const strength = getPasswordStrength(passwordValue)

  const passwordChecks = [
    { label: 'En az 8 karakter', met: passwordValue.length >= 8 },
    { label: 'En az 1 büyük harf', met: /[A-Z]/.test(passwordValue) },
    { label: 'En az 1 rakam', met: /[0-9]/.test(passwordValue) },
  ]

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
      setError('Google ile kayıt yapılamadı. Lütfen tekrar deneyin.')
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
      setError('Apple ile kayıt yapılamadı. Lütfen tekrar deneyin.')
      setAppleLoading(false)
    }
  }

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)
    setError('')
    
    const fd = new FormData()
    fd.append('name', data.name)
    fd.append('email', data.email)
    fd.append('password', data.password)
    fd.append('confirmPassword', data.confirmPassword)
    fd.append('terms', String(data.terms))
    fd.append('turnstileToken', turnstileToken)
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: fd
      })
      
      const resData = await res.json()
      
      if (!res.ok) {
        setError(resData.error || 'Kayıt işlemi başarısız.')
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

          <button 
            onClick={handleResend}
            disabled={resendLoading || resendSuccess}
            className="w-full mt-4 py-3.5 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
          >
            {resendLoading ? 'Gönderiliyor...' : resendSuccess ? '✓ Tekrar Gönderildi' : 'E-postayı Tekrar Gönder'}
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
              src="/logo.webp" 
              alt="Odi Logo" 
              width={96} 
              height={96}
              className="w-full h-full object-cover rounded-[22px]"
              priority
            />
          </Link>
          <h1 className="text-[30px] font-black text-text-primary tracking-tighter">Yeni Hesap Oluştur</h1>
          <p className="text-[10px] font-bold text-text-secondary/80 mt-1 uppercase tracking-widest">Odi.Pet Ekosistemine Katılın</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
          {showTurnstile && (
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
              onSuccess={(token) => {
                setTurnstileToken(token)
                setValue('turnstileToken', token)
              }}
              options={{ size: 'invisible' }}
            />
          )}
          {error && (
            <div role="alert" className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
              ⚠️ {error}
            </div>
          )}

          <fieldset disabled={loading || googleLoading || appleLoading} className="w-full min-w-0">
            <div className="w-full overflow-hidden pb-1">
              <div 
                className="flex w-[200%] transition-transform duration-500 ease-in-out" 
                style={{ transform: `translateX(-${(step - 1) * 50}%)` }}
              >
              
              {/* STEP 1 */}
              <div className="w-1/2 flex flex-col gap-6 px-1">
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
                      {googleLoading ? 'Yönlendiriliyor...' : 'Google'}
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
                      {appleLoading ? 'Yönlendiriliyor...' : 'Apple'}
                    </button>
                  </div>
                  
                  <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t-2 border-border-main"></div>
                    <span className="flex-shrink-0 mx-4 text-text-secondary font-black text-[11px] uppercase tracking-widest px-3 py-1 bg-white rounded-full shadow-sm border border-border-main">veya</span>
                    <div className="flex-grow border-t-2 border-border-main"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="name">
                    Ad Soyad
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Örn: Ahmet Yılmaz"
                    {...register('name')}
                    onFocus={() => setShowTurnstile(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNextStep();
                      }
                    }}
                    className={`input-base py-3 text-[15px] ${errors.name ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
                  />
                  {errors.name && <span role="alert" className="text-error text-[11px] font-bold ml-1">{errors.name.message}</span>}
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
                    onFocus={() => setShowTurnstile(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNextStep();
                      }
                    }}
                    className={`input-base py-3 text-[15px] ${errors.email ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
                  />
                  {errors.email && <span role="alert" className="text-error text-[11px] font-bold ml-1">{errors.email.message}</span>}
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary w-full mt-4 py-4 text-[15px] font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  İleri
                </button>

                <div className="text-center mt-6">
                  <p className="text-[14px] text-text-secondary font-medium">
                    Zaten bir hesabınız var mı?{' '}
                    <Link href="/login" className="font-black text-primary hover:text-primary-hover hover:underline transition-all">
                      Giriş Yapın
                    </Link>
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="w-1/2 flex flex-col gap-6 px-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="self-start text-[13px] font-bold text-text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                  Geri Dön
                </button>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="password">
              Güçlü Bir Şifre
            </label>
            <div className="relative group">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                onFocus={() => setShowTurnstile(true)}
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
            
            {/* Strength bar */}
            <div className="flex gap-1 h-1.5 mt-1 px-1">
              <div className={`flex-1 rounded-full transition-colors ${strength.score > 0 ? strength.color : 'bg-border-main/50'}`}></div>
              <div className={`flex-1 rounded-full transition-colors ${strength.score > 1 ? strength.color : 'bg-border-main/50'}`}></div>
              <div className={`flex-1 rounded-full transition-colors ${strength.score > 2 ? strength.color : 'bg-border-main/50'}`}></div>
            </div>
            {passwordValue && strength.text && (
              <div className={`text-[10px] font-bold mt-0.5 text-right px-1 ${strengthTextColors[strength.score] || 'text-text-secondary'}`}>
                {strength.text}
              </div>
            )}

            {/* Live password requirements checklist */}
            {passwordValue && (
              <ul className="flex flex-col gap-1 mt-1 px-1">
                {passwordChecks.map((check) => (
                  <li key={check.label} className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${check.met ? 'text-success' : 'text-text-secondary/60'}`}>
                    <span className="text-[13px]">{check.met ? '✓' : '○'}</span>
                    {check.label}
                  </li>
                ))}
              </ul>
            )}
            
            {errors.password && <span role="alert" className="text-error text-[11px] font-bold ml-1">{errors.password.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="confirmPassword">
              Şifreyi Onayla
            </label>
            <div className="relative group">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={`input-base py-3 text-[15px] pr-12 w-full ${errors.confirmPassword ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-secondary hover:text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <span role="alert" className="text-error text-[11px] font-bold ml-1">{errors.confirmPassword.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-3 mt-1 px-1">
              <input type="checkbox" id="terms" {...register('terms')} className="mt-1 w-4 h-4 rounded border-border-main text-primary focus:ring-primary" />
              <label htmlFor="terms" className="text-[12px] text-text-secondary leading-snug">
                <Link href="/legal/terms" target="_blank" className="font-bold text-primary hover:underline">Kullanım Koşullarını</Link> ve <Link href="/legal/kvkk" target="_blank" className="font-bold text-primary hover:underline">Gizlilik Politikası</Link>'nı okudum, onaylıyorum.
              </label>
            </div>
            {errors.terms && <span role="alert" className="text-error text-[11px] font-bold ml-1 px-1">{errors.terms.message}</span>}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading || appleLoading}
            className="btn-primary w-full mt-4 py-4 text-[15px] font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98] transition-all"
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

                <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border-main/50 text-[11px] font-bold text-text-secondary/70">
                  <span className="flex items-center gap-1.5"><span className="text-[14px]">🔒</span> 256-bit SSL Koruması</span>
                  <span className="flex items-center gap-1.5"><span className="text-[14px]">🛡️</span> KVKK Uyumlu</span>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
        </form>
      </div>
    </div>
  )
}
