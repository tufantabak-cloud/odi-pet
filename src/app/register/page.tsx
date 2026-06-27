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
import ReferralCaptureListener from '@/components/ReferralCaptureListener'

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
  return { score, color: 'bg-success', text: 'Güçlü' }
}

const strengthTextColors: Record<number, string> = {
  1: 'text-error',
  2: 'text-warning',
  3: 'text-success',
  4: 'text-success',
}

// ── Adım Göstergesi ──────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = [
    { id: 1, label: 'Bilgiler' },
    { id: 2, label: 'Şifre Belirleme' },
  ]
  return (
    <div className="flex items-center justify-center gap-0 mb-7 w-full px-4">
      {steps.map((s, i) => {
        const isCompleted = step > s.id
        const isActive = step === s.id
        return (
          <div key={s.id} className="flex items-center">
            {/* Daire */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all duration-300 ${
                isCompleted
                  ? 'bg-primary text-white'
                  : isActive
                    ? 'bg-primary text-white ring-4 ring-primary/20 scale-110'
                    : 'bg-border-main text-text-secondary/60'
              }`}>
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : s.id}
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-primary' : isCompleted ? 'text-primary/70' : 'text-text-secondary/50'}`}>
                {s.label}
              </span>
            </div>
            {/* Bağlantı çizgisi */}
            {i < steps.length - 1 && (
              <div className="relative w-16 h-0.5 mx-1 mb-5">
                <div className="absolute inset-0 bg-border-main rounded-full" />
                <div className={`absolute inset-0 rounded-full transition-all duration-500 ${step > s.id ? 'bg-primary w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
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
    mode: 'onBlur',
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
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) throw error
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch { /* sessiz fail */ } finally {
      setResendLoading(false)
    }
  }

  const passwordValue = watch('password') || ''
  const strength = getPasswordStrength(passwordValue)

  const passwordChecks = [
    { label: '8 karakter veya daha uzun', met: passwordValue.length >= 8 },
    { label: 'En az 1 büyük harf', met: /[A-Z]/.test(passwordValue) },
    { label: 'En az 1 rakam', met: /[0-9]/.test(passwordValue) },
  ]

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) throw error
    } catch { setError('Google ile kayıt yapılamadı.'); setGoogleLoading(false) }
  }

  const handleAppleLogin = async () => {
    setAppleLoading(true); setError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) throw error
    } catch { setError('Apple ile kayıt yapılamadı.'); setAppleLoading(false) }
  }

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('name', data.name)
    fd.append('email', data.email)
    fd.append('password', data.password)
    fd.append('confirmPassword', data.confirmPassword)
    fd.append('terms', String(data.terms))
    fd.append('turnstileToken', turnstileToken)
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', body: fd })
      const resData = await res.json()
      if (!res.ok) { setError(resData.error || 'Kayıt işlemi başarısız.'); return }
      setSuccess(true)
    } catch { setError('Bağlantı hatası oluştu.') } finally { setLoading(false) }
  }

  // ── Başarı Ekranı ────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center p-4"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(79,45,186,0.07) 0%, #F8FAFC 65%)' }}>
        <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl shadow-primary/10 border border-border-main/60 overflow-hidden animate-in zoom-in fade-in duration-300">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-primary"/>
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-5 animate-in zoom-in duration-300">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-[26px] font-black text-text-primary tracking-tight mb-3">Aramıza Hoş Geldiniz!</h2>
            <p className="text-[14px] text-text-secondary leading-relaxed mb-7 max-w-xs">
              Kaydınız başarıyla oluşturuldu. Lütfen hesabınızı etkinleştirmek için e-posta adresinize gönderilen doğrulama bağlantısına tıklayın. E-posta gelmezse spam klasörünüzü kontrol edebilirsiniz.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary w-full h-[52px] text-[15px] shadow-lg shadow-primary/20 hover:shadow-primary/40"
            >
              Giriş Sayfasına Git
            </button>
            <button
              onClick={handleResend}
              disabled={resendLoading || resendSuccess}
              className="w-full mt-3 h-11 text-[14px] font-bold text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
            >
              {resendLoading ? 'Gönderiliyor…' : resendSuccess ? '✓ Tekrar Gönderildi' : 'E-postayı Tekrar Gönder'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Ana Form ─────────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(79,45,186,0.07) 0%, #F8FAFC 65%)' }}>

      {/* Referral parametresini pasif olarak yakala */}
      <ReferralCaptureListener />

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[32px] shadow-2xl shadow-primary/10 border border-border-main/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Mor üst şerit */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-primary" />

          {/* Step 2: minimal başlık bar */}
          {step === 2 && (
            <div className="flex items-center px-6 pt-5 pb-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-[13px] font-bold text-text-secondary hover:text-primary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Geri Dön
              </button>
              <span className="mx-auto text-[15px] font-extrabold text-text-primary">Hesap Oluştur</span>
              <div className="w-16" />{/* Dengeleyici */}
            </div>
          )}

          <div className="p-6 sm:p-8 pt-5">

            {/* ── Logo & Başlık (sadece adım 1) ── */}
            {step === 1 && (
              <div className="flex flex-col items-center gap-3 mb-6">
                <Link href="/" className="w-[64px] h-[64px] rounded-[18px] overflow-hidden shadow-lg shadow-primary/20 hover:scale-105 transition-transform border border-border-main/40">
                  <Image src="/logo.webp" alt="Odi.Pet" width={64} height={64} className="w-full h-full object-cover" priority />
                </Link>
                <div className="text-center">
                  <h1 className="text-[22px] font-black text-text-primary tracking-tighter">Yeni Hesap Oluştur</h1>
                  <p className="text-[10px] font-black text-text-secondary/60 mt-1 uppercase tracking-widest">Odi.Pet Ekosistemine Katılın</p>
                </div>
              </div>
            )}

            {/* ── Adım Göstergesi ── */}
            <StepIndicator step={step} />

            {/* ── Hata Mesajı ── */}
            {error && (
              <div role="alert" aria-live="assertive"
                className="mb-4 p-3.5 rounded-2xl bg-error/5 border border-error/20 text-error text-[13px] font-bold text-center animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Turnstile */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={(token) => { setTurnstileToken(token); setValue('turnstileToken', token) }}
                options={{ size: 'invisible' }}
              />
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <fieldset disabled={loading || googleLoading || appleLoading} className="w-full min-w-0">

                {/* ═══ ADIM 1 ═══ */}
                <div className={`flex-col gap-4 ${step === 1 ? 'flex' : 'hidden'}`}>

                  {/* Sosyal butonlar */}
                  <div className="flex flex-col gap-2.5">
                    <button type="button" onClick={handleGoogleLogin}
                      disabled={googleLoading || appleLoading || loading}
                      className="w-full h-[50px] flex items-center justify-center gap-3 bg-white border border-border-main rounded-[14px] font-bold text-[14px] text-text-primary shadow-sm hover:bg-bg-main hover:border-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-60">
                      {googleLoading
                        ? <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        : <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                      }
                      {googleLoading ? 'Yönlendiriliyor…' : 'Google ile devam et'}
                    </button>
                    <button type="button" onClick={handleAppleLogin}
                      disabled={googleLoading || appleLoading || loading}
                      className="w-full h-[50px] flex items-center justify-center gap-3 bg-[#050505] rounded-[14px] font-bold text-[14px] text-white shadow-sm hover:bg-black/85 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-60">
                      {appleLoading
                        ? <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        : <svg className="w-5 h-5 shrink-0" viewBox="0 0 384 512" fill="currentColor">
                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                          </svg>
                      }
                      {appleLoading ? 'Yönlendiriliyor…' : 'Apple ile devam et'}
                    </button>
                  </div>

                  {/* Ayraç */}
                  <div className="relative flex items-center">
                    <div className="flex-grow h-px bg-border-main" />
                    <span className="mx-3 px-2 text-[11px] font-black text-text-secondary/50 uppercase tracking-widest bg-white">veya</span>
                    <div className="flex-grow h-px bg-border-main" />
                  </div>

                  {/* Ad Soyad */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Ad Soyad</label>
                    <input id="name" type="text" placeholder="Adınız ve Soyadınız" autoFocus
                      {...register('name')}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNextStep() } }}
                      aria-invalid={!!errors.name}
                      className={`input-base py-3 text-[15px] ${errors.name ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`} />
                    {errors.name && <span role="alert" className="text-error text-[11px] font-bold">{errors.name.message}</span>}
                  </div>

                  {/* E-posta */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-email" className="text-[11px] font-black text-text-secondary uppercase tracking-wider">E-Posta</label>
                    <input id="reg-email" type="email" placeholder="E-posta adresiniz"
                      {...register('email')}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNextStep() } }}
                      aria-invalid={!!errors.email}
                      className={`input-base py-3 text-[15px] ${errors.email ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`} />
                    {errors.email && <span role="alert" className="text-error text-[11px] font-bold">{errors.email.message}</span>}
                  </div>

                  {/* İleri */}
                  <button type="button" onClick={handleNextStep}
                    className="btn-primary w-full h-[52px] mt-1 text-[15px] shadow-lg shadow-primary/20 hover:shadow-primary/40">
                    İleri
                  </button>

                  <p className="text-center text-[14px] text-text-secondary font-medium mt-1">
                    Zaten hesabınız var mı?{' '}
                    <Link href="/login" className="font-black text-primary hover:underline">Giriş Yapın</Link>
                  </p>

                </div>{/* /adım 1 */}

                {/* ═══ ADIM 2 ═══ */}
                <div className={`flex-col gap-4 ${step === 2 ? 'flex' : 'hidden'}`}>

                  {/* Şifre */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Şifre</label>
                    <div className="relative">
                      <input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                        {...register('password')}
                        aria-invalid={!!errors.password}
                        className={`input-base py-3 text-[15px] pr-11 w-full ${errors.password ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-primary transition-colors">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Güç çubuğu */}
                    {passwordValue && (
                      <>
                        <div className="flex gap-1 h-2 px-0.5 mt-0.5">
                          {[1,2,3].map(i => (
                            <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${strength.score >= i ? strength.color : 'bg-border-main/50'}`} />
                          ))}
                        </div>
                        <div className={`text-[11px] font-bold text-right px-0.5 ${strengthTextColors[strength.score] || ''}`}>
                          {strength.text}
                        </div>
                        <ul className="flex flex-col gap-1 mt-0.5">
                          {passwordChecks.map(check => (
                            <li key={check.label} className={`flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${check.met ? 'text-success' : 'text-text-secondary/50'}`}>
                              <span>{check.met ? '✓' : '○'}</span>
                              {check.label}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {errors.password && <span role="alert" className="text-error text-[11px] font-bold">{errors.password.message}</span>}
                  </div>

                  {/* Şifre Tekrar */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="confirmPassword" className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Şifre Tekrar</label>
                    <div className="relative">
                      <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••"
                        {...register('confirmPassword')}
                        aria-invalid={!!errors.confirmPassword}
                        className={`input-base py-3 text-[15px] pr-11 w-full ${errors.confirmPassword ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-primary transition-colors">
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <span role="alert" className="text-error text-[11px] font-bold">{errors.confirmPassword.message}</span>}
                  </div>

                  {/* KVKK */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="terms" {...register('terms')}
                        className="mt-0.5 w-4 h-4 rounded border-border-main text-primary focus:ring-primary shrink-0 cursor-pointer" />
                      <label htmlFor="terms" className="text-[12px] text-text-secondary leading-snug cursor-pointer">
                        <Link href="/legal/terms" target="_blank" className="font-bold text-primary hover:underline">Kullanım Koşullarını</Link>{' '}ve{' '}
                        <Link href="/legal/kvkk" target="_blank" className="font-bold text-primary hover:underline">Gizlilik Politikası</Link>'nı okudum, onaylıyorum.
                      </label>
                    </div>
                    {errors.terms && <span role="alert" className="text-error text-[11px] font-bold">{errors.terms.message}</span>}
                  </div>

                  {/* Kayıt Ol */}
                  <button type="submit" disabled={loading || googleLoading || appleLoading}
                    className="btn-primary w-full h-[52px] mt-1 text-[15px] shadow-lg shadow-primary/20 hover:shadow-primary/40 flex items-center justify-center">
                    {loading ? (
                      <span className="flex items-center gap-2.5">
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Hesap Oluşturuluyor…
                      </span>
                    ) : 'Kayıt Ol ve Başla'}
                  </button>

                  {/* SSL/KVKK */}
                  <div className="flex items-center justify-center gap-5 pt-4 border-t border-border-main/40">
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

                </div>{/* /adım 2 */}

              </fieldset>
            </form>

          </div>{/* /p-6 */}
        </div>{/* /kart */}
      </div>
    </div>
  )
}
