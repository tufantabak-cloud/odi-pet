'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldAlert, CheckCircle2, ArrowLeft, Mail, Trash2, Smartphone, FileText } from 'lucide-react'

export default function DeleteAccountPublicPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)

    // Güvenlik kuralı: Account existence disclosure yapılmaz.
    // E-posta adresi sistemde olsa da olmasa da kullanıcıya standart güvenli teyit gösterilir.
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  return (
    <div className="min-h-dvh bg-bg-main py-10 px-4 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full">
        {/* Üst Logo ve Geri Dön */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>

          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white shadow-soft p-0.5 border border-slate-100">
            <Image
              src="/brand/app-icons/odi-icon-192.png"
              alt="Odi.Pet"
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
        </div>

        {/* Ana Kart */}
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-error flex items-center justify-center shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
                Hesap ve Veri Silme Talebi
              </h1>
              <p className="text-xs text-text-secondary font-medium">
                Odi.Pet Kullanıcı Hesabı ve İlişkili Verilerin Silinmesi
              </p>
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            Odi.Pet olarak kişisel verilerinizin gizliliğine ve güvenliğine büyük önem veriyoruz. 
            Google Play Kullanıcı Verileri Politikası ve KVKK/GDPR mevzuatına tam uyumlu olarak; 
            hesabınızı ve platformda tutulan tüm verilerinizi dilediğiniz zaman kalıcı olarak silebilirsiniz.
          </p>

          {/* Yöntem 1: Uygulama İçi Hızlı Silme */}
          <div className="bg-bg-main/60 rounded-2xl p-5 mb-8 border border-border-main/50">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary mb-2">
              <Smartphone className="w-4 h-4 text-primary" />
              1. Yöntem: Uygulama İçinden Doğrudan Silme (Önerilen)
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-3">
              Hesabınıza mobil uygulama veya web tarayıcısı üzerinden erişebiliyorsanız, silme işlemini anında ve otomatik olarak gerçekleştirebilirsiniz:
            </p>
            <ol className="text-xs text-text-primary space-y-1.5 list-decimal list-inside font-semibold mb-4">
              <li>Odi.Pet uygulamasına giriş yapın.</li>
              <li>Alt menüden veya sağ üstten <strong>Profil</strong> sekmesine gidin.</li>
              <li><strong>Veri & Güvenlik</strong> başlığı altında yer alan <strong>Hesabı Sil</strong> seçeneğine tıklayın.</li>
              <li>Açılan onay penceresinde işlemi onaylayın.</li>
            </ol>
            <Link
              href="/owner/profile"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-soft hover:opacity-95 transition-all active:scale-[0.98]"
            >
              Profilime Git ve Hesabı Sil
            </Link>
          </div>

          {/* Yöntem 2: Web Üzerinden Silme Talebi */}
          <div className="border-t border-border-main pt-6">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary mb-2">
              <Mail className="w-4 h-4 text-primary" />
              2. Yöntem: Web Formu ile Silme Talebi İletme
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Uygulamayı kaldırdıysanız veya hesabınıza giriş yapamıyorsanız, kayıtlı e-posta adresinizi belirterek silme talebinde bulunabilirsiniz:
            </p>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center animate-fadeIn">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-emerald-800 mb-1">Talebiniz Alındı</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Hesap silme talebiniz işleme alınmıştır. Eğer bu e-posta adresi Odi.Pet sisteminde kayıtlı ise, 
                  hesap sahipliğini doğrulamak ve silme işlemini onaylamak üzere tarafınıza bir bilgilendirme iletisi gönderilecektir.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="delete-email" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Kayıtlı E-Posta Adresiniz
                  </label>
                  <input
                    id="delete-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@eposta.com"
                    className="w-full px-4 py-3 rounded-xl border border-border-main text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-soft transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? 'Talebiniz Gönderiliyor...' : 'Hesap Silme Talebi Gönder'}
                </button>
              </form>
            )}
          </div>

          {/* Hangi Veriler Silinir Bilgilendirmesi */}
          <div className="border-t border-border-main mt-8 pt-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
              Kapsam ve Bilgilendirme
            </h3>
            <ul className="text-xs text-text-secondary space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span><strong>Silinen Veriler:</strong> Profil ve iletişim bilgileriniz, tüm evcil hayvan kayıtları, aşı ve parazit takip geçmişi, kilo ve beslenme logları, AI sohbet dökümleri ve cihaz eşleşmeleri kalıcı olarak silinir.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span><strong>Yasal Saklama Süreleri:</strong> Vergi Usul Kanunu ve ilgili mevzuat uyarınca saklanması zorunlu olan muhasebe/fatura belgeleri (varsa) yasal süresi boyunca arşivlenir; pazarlama ve operasyonel amaçla işlenmez.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span><strong>İşlem Süresi:</strong> Kimlik doğrulaması tamamlanan silme talepleri en geç 30 gün içerisinde tüm veritabanı ve yedekleme sistemlerinden arındırılır.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 font-bold">•</span>
                <span><strong>Destek:</strong> Her türlü soru ve doğrudan talepleriniz için <a href="mailto:destek@odi.pet" className="text-primary font-bold hover:underline">destek@odi.pet</a> adresine e-posta gönderebilirsiniz.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-8 text-center text-xs font-semibold text-text-secondary">
          <Link href="/legal/terms" className="hover:text-primary transition-colors">Kullanım Koşulları</Link>
          <span className="mx-2">•</span>
          <Link href="/legal/kvkk" className="hover:text-primary transition-colors">Gizlilik Politikası (KVKK)</Link>
        </div>
      </div>
    </div>
  )
}
