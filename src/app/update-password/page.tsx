'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message || 'Şifre güncellenemedi.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err) {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-bg-main bg-gradient-to-tr from-primary/5 via-transparent to-primary/5">
      <div className="w-full max-w-[420px] card-base p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center justify-center w-24 h-24 rounded-[24px] overflow-hidden shadow-2xl shadow-primary/20 mb-6 hover:scale-105 transition-transform bg-white p-0.5">
            <Image 
              src="/logo.jpg" 
              alt="Odi Logo" 
              width={96} 
              height={96}
              className="w-full h-full object-cover rounded-[22px]"
              priority
            />
          </Link>
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
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center animate-in shake-in duration-300">
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
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base py-3 text-[15px] pr-12 w-full"
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
            </div>

            <button
              type="submit"
              disabled={loading || !password || password.length < 6}
              className="btn-primary w-full mt-2 py-4 text-[15px] font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {loading ? 'Güncelleniyor...' : 'Şifreyi Kaydet'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
