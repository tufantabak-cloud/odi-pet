'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then(mod => mod.Turnstile), { ssr: false })
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'
import { Button, Input, GlassCard } from '@/components/ui/primitives'

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
    <div className="flex min-h-dvh w-full items-center justify-center p-4 bg-bg-main font-sans">
      <GlassCard padding="lg" className="max-w-sm relative overflow-hidden">
        <div className="text-center mb-10">
          <div className="flex flex-col items-center mb-6">
              <Image src="/brand/app-icons/odi-icon-512.png" alt="Odi Logo" width={72} height={72} className="mb-2" priority />
              <p className="text-[11px] text-text-muted font-medium">Can Dost Yaşam Platformu</p>
            </div>
          {/* docs/opos-design-system/03_typography.md → text-h1 (24px/700/-0.02em/1.2) — "text-h1" utility globals.css'te tanımlı değil (frozen), kanonik ham değerler kullanıldı */}
          <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-[1.2] text-text-primary">Şifremi Unuttum</h1>
          <p className="text-[13px] text-text-secondary mt-2">Hesabınıza kayıtlı e-posta adresini girin, size şifre sıfırlama bağlantısı gönderelim.</p>
        </div>

        {success ? (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success text-[14px] font-bold mb-6">
              ✅ Sıfırlama bağlantısı gönderildi! Lütfen e-posta kutunuzu (ve gerekiyorsa spam klasörünü) kontrol edin.
            </div>
            <Link href="/login" className="w-full bg-primary text-white rounded-xl font-medium text-base py-3 mt-1 hover:opacity-90 transition-opacity flex items-center justify-center shadow-md disabled:opacity-60">
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

            <Input
              id="email"
              label="E-posta Adresi"
              placeholder="ornek@email.com"
              autoFocus
              {...register('email')}
              autoComplete="email"
              error={errors.email?.message}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading} disabled={loading}>
              {loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
            </Button>

            <div className="text-center mt-4">
              <Link href="/login" className="text-[14px] font-bold text-text-secondary hover:text-primary transition-colors">
                ← Giriş Sayfasına Dön
              </Link>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  )
}
