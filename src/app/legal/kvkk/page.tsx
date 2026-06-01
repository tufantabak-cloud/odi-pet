import Link from 'next/link'

export const metadata = {
  title: 'Gizlilik Politikası (KVKK) - Odi.Pet',
  description: 'Odi.Pet gizlilik politikası ve kişisel verilerin korunması kanunu aydınlatma metni.',
}

export default function KVKKPage() {
  return (
    <div className="min-h-dvh bg-bg-main py-10 px-4">
      <div className="max-w-3xl mx-auto card-base p-6 md:p-10 animate-fadeIn">
        <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-primary hover:underline mb-8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Ana Sayfaya Dön
        </Link>

        <h1 className="text-[28px] font-black text-text-primary mb-2">Gizlilik Politikası (KVKK)</h1>
        <p className="text-[13px] text-text-secondary mb-8 border-b border-border-main pb-4">Son Güncelleme: 18 Mayıs 2026</p>

        <div className="prose prose-sm max-w-none text-text-primary text-[15px] leading-relaxed flex flex-col gap-6">
          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">1. Veri Sorumlusu</h2>
            <p>Odi.Pet (Bundan böyle "Platform" veya "Şirket" olarak anılacaktır) olarak, 6698 Sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizin güvenliğine büyük önem vermekteyiz.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">2. İşlenen Kişisel Veriler</h2>
            <p>Platformumuzu kullanmanız sürecinde; ad soyad, iletişim bilgileri (e-posta), şifre bilgileriniz ve evcil hayvanınıza ait sağlık/profil verileri işlenmektedir.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">3. Kişisel Verilerin İşlenme Amacı</h2>
            <p>Verileriniz, size hizmet sunabilmek (örn. aşı hatırlatıcıları, AI Vet analizleri, randevu takibi) ve yasal yükümlülüklerimizi yerine getirmek amacıyla işlenmektedir.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">4. Haklarınız</h2>
            <p>KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, silinmesini veya düzeltilmesini talep etme hakkına sahipsiniz. Taleplerinizi <a href="mailto:destek@odi.pet" className="text-primary hover:underline font-bold">destek@odi.pet</a> adresi üzerinden iletebilirsiniz.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
