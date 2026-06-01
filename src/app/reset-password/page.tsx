'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then(mod => mod.Turnstile), { ssr: false })
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const fd = new FormData()
      fd.append('email', data.email)
      fd.append('turnstileToken', turnstileToken)

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        body: fd
      })

      const resData = await res.json()

      if (!res.ok) {
        setError(resData.error || 'Şifre sıfırlama e-postası gönderilemedi.')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5">
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
          <h1 className="text-[28px] font-black text-text-primary tracking-tighter">Şifremi Unuttum</h1>
          <p className="text-[13px] text-text-secondary mt-2">Hesabınıza kayıtlı e-posta adresini girin, size şifre sıfırlama bağlantısı gönderelim.</p>
        </div>

        {success ? (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success text-[14px] font-bold mb-6">
              ✅ Sıfırlama bağlantısı gönderildi! Lütfen e-posta kutunuzu (ve gerekiyorsa spam klasörünü) kontrol edin.
            </div>
            <Link href="/login" className="btn-primary w-full py-4 block shadow-lg shadow-primary/20">
              Giriş Sayfasına Dön
            </Link>
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
              <div role="alert" aria-live="assertive" className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in shake-in duration-300">
                ⚠️ {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider ml-1" htmlFor="email">
                E-posta Adresi
              </label>
              <input
                id="email"
                placeholder="ornek@email.com"
                autoFocus
                {...register('email')}
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'reset-email-error' : undefined}
                className={`input-base py-3 text-[15px] ${errors.email ? 'border-error/50 focus:border-error focus:ring-error/20' : ''}`}
              />
              {errors.email && <span id="reset-email-error" role="alert" className="text-error text-[11px] font-bold ml-1">{errors.email.message}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-4 text-[15px] font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
            </button>

            <div className="text-center mt-4">
              <Link href="/login" className="text-[14px] font-bold text-text-secondary hover:text-primary transition-colors">
                ← Giriş Sayfasına Dön
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
