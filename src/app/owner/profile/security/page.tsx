'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  KeyRound,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Fingerprint
} from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function AccountSecurityPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (newPassword.length < 6) {
      setMsg({ type: 'err', text: 'Yeni şifre en az 6 karakter olmalıdır.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'err', text: 'Yeni şifreler birbiriyle eşleşmiyor.' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw error
      }

      setMsg({ type: 'ok', text: 'Şifreniz başarıyla güncellendi.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Şifre güncellenirken bir hata oluştu.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-main pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border-main/50 px-4 py-3 flex items-center justify-between">
        <Link
          href="/owner/profile"
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-surface border border-border-main text-text-secondary hover:text-primary transition-all active:scale-95"
          aria-label="Geri Dön"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-extrabold text-text-primary tracking-tight">Hesap Güvenliği</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Info Banner */}
        <div className="p-4 rounded-3xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-purple-950">Hesap ve Giriş Güvenliği</h2>
            <p className="text-xs text-purple-800/80 mt-0.5 leading-relaxed">
              Odi.Pet hesabınızın güvenliğini artırmak için güçlü bir şifre belirleyebilir ve biyometrik girişinizi yönetebilirsiniz.
            </p>
          </div>
        </div>

        {/* Password Update Form */}
        <section className="bg-surface rounded-3xl p-6 border border-border-main shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border-main/60">
            <KeyRound className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Şifre Değiştir</h2>
          </div>

          {msg && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                msg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-error border border-rose-200'
              }`}
            >
              {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Yeni Şifre</label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  required
                  className="w-full min-h-11 px-3.5 py-2.5 rounded-2xl bg-bg-main border border-border-main text-xs font-medium text-text-primary outline-none focus:border-primary focus:bg-surface transition-all"
                />
                <Lock className="w-4 h-4 text-text-tertiary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Yeni Şifre Tekrar</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Şifrenizi doğrulayın"
                  required
                  className="w-full min-h-11 px-3.5 py-2.5 rounded-2xl bg-bg-main border border-border-main text-xs font-medium text-text-primary outline-none focus:border-primary focus:bg-surface transition-all"
                />
                <Lock className="w-4 h-4 text-text-tertiary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full min-h-11 py-3 px-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                'Şifreyi Güncelle'
              )}
            </button>
          </form>
        </section>

        {/* Biometrics & Fast Login */}
        <section className="bg-surface rounded-3xl p-6 border border-border-main shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border-main/60">
            <Fingerprint className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Hızlı ve Güvenli Giriş</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Parmak izi veya Face ID ile şifre yazmadan tek dokunuşla güvenli giriş yapabilirsiniz.
          </p>
        </section>
      </main>
    </div>
  )
}
