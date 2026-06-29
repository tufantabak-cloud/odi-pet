'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then(mod => mod.Turnstile), { ssr: false })
import { updatePasswordSchema, type UpdatePasswordInput } from '@/lib/validations/auth'

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

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    mode: 'onBlur',
  })

  const passwordValue = watch('password') || ''
  const strength = getPasswordStrength(passwordValue)

  const passwordChecks = [
    { label: 'En az 8 karakter', met: passwordValue.length >= 8 },
    { label: 'En az 1 büyük harf', met: /[A-Z]/.test(passwordValue) },
    { label: 'En az 1 rakam', met: /[0-9]/.test(passwordValue) },
  ]

  const onSubmit = async (data: UpdatePasswordInput) => {
    setLoading(true)
    setError('')
    setSuccess(false)

    const fd = new FormData()
    fd.append('password', data.password)
    fd.append('confirmPassword', data.confirmPassword)
    fd.append('turnstileToken', turnstileToken)

    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        body: fd,
      })

      const resData = await res.json()

      if (!res.ok) {
        setError(resData.error || 'Şifre güncellenemedi.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 500)
    } catch {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4 bg-[#FAF8FF] font-montserrat">
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-border w-full max-w-sm relative overflow-hidden">
        <div className="text-center mb-10">
          <div className="flex flex-col items-center mb-6">
              <Image src="/logo.webp" alt="Odi.Pet" width={72} height={72} className="mb-2" priority />
              <p className="text-[11px] text-text-muted font-medium">Pet Yaşam Ekosistemi</p>
            </div>
          <h1 className="text-[28px] font-black text-text-primary tracking-tighter">Yeni Şifre Belirle</h1>
          <p className="text-[13px] text-text-secondary mt-2">Hesabınız için yeni ve güvenli bir şifre oluşturun.</p>
        </div>

        {success ? (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success text-[14px] font-bold mb-6">
              ✅ Şifreniz başarıyla güncellendi! Yönlendiriliyorsunuz...
            </div>
          </div>
        ) : (
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
            {error && (
              <div role="alert" aria-live="assertive" className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                ⚠️ {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="password">
                Yeni Şifre
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoFocus
                  {...register('password')}
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'update-password-error' : undefined}
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

              {errors.password && <span id="update-password-error" role="alert" className="text-error text-[11px] font-bold ml-1">{errors.password.message}</span>}
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
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'update-confirm-error' : undefined}
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
              {errors.confirmPassword && <span id="update-confirm-error" role="alert" className="text-error text-[11px] font-bold ml-1">{errors.confirmPassword.message}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4726AF] text-white rounded-xl font-medium text-[15px] py-3 mt-1 hover:opacity-90 transition-opacity flex items-center justify-center shadow-md disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Güncelleniyor...
                </span>
              ) : 'Şifreyi Kaydet'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
