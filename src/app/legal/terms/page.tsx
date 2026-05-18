import Link from 'next/link'

export const metadata = {
  title: 'Kullanım Koşulları - Odi.Pet',
  description: 'Odi.Pet platformu kullanım koşulları.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-main py-10 px-4">
      <div className="max-w-3xl mx-auto card-base p-6 md:p-10 animate-fadeIn">
        <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-primary hover:underline mb-8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Ana Sayfaya Dön
        </Link>

        <h1 className="text-[28px] font-black text-text-primary mb-2">Kullanım Koşulları</h1>
        <p className="text-[13px] text-text-secondary mb-8 border-b border-border-main pb-4">Son Güncelleme: 18 Mayıs 2026</p>

        <div className="prose prose-sm max-w-none text-text-primary text-[15px] leading-relaxed flex flex-col gap-6">
          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">1. Genel Kurallar</h2>
            <p>Odi.Pet platformuna kayıt olarak bu kullanım koşullarını kabul etmiş sayılırsınız. Platform, evcil hayvan sahiplerine yönelik bir bilgi takip ve asistanlık hizmetidir.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">2. Tıbbi Tavsiye Değildir (Önemli Uyarı)</h2>
            <p>Odi.Pet (özellikle "AI Vet" özelliği), profesyonel veteriner hekim teşhisinin ve tedavisinin yerini <strong>tutmaz</strong>. Platformda sağlanan bilgiler tamamen genel triaj ve bilgilendirme amaçlıdır. Acil veya ciddi sağlık sorunlarında derhal bir kliniğe başvurmanız gerekmektedir. Platform, doğabilecek sağlık sorunlarından sorumlu tutulamaz.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">3. Kullanıcı Sorumlulukları</h2>
            <p>Kullanıcılar, sisteme girdikleri bilgilerin doğruluğundan bizzat sorumludur. Hesabınızın güvenliğini sağlamak için şifrenizi üçüncü şahıslarla paylaşmamalısınız.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-extrabold text-primary mb-3">4. Fikri Mülkiyet</h2>
            <p>Platformda yer alan tüm yazılım, tasarım ve içerik hakları Odi.Pet'e aittir. İzinsiz kopyalanamaz veya ticari amaçla kullanılamaz.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
