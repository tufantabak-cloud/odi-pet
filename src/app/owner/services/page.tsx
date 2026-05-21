import Link from 'next/link'

export default function ServicesPage() {
  const services = [
    {
      id: 'groomer',
      title: 'Kuaför & Bakım',
      description: 'Can dostunuz için profesyonel tüy kesimi, banyo, tırnak bakımı ve spa hizmetleri.',
      icon: '✂️',
      badge: 'Son Fazda',
      color: 'from-pink-500/10 to-rose-500/10 text-pink-600 border-pink-500/20',
    },
    {
      id: 'boarding',
      title: 'Pansiyon & Otel',
      description: 'Seyahate çıktığınızda gözünüz arkada kalmasın. Güvenli, konforlu ve sevgi dolu konaklama.',
      icon: '🏨',
      badge: 'Son Fazda',
      color: 'from-violet-500/10 to-purple-500/10 text-violet-600 border-violet-500/20',
    },
    {
      id: 'walker',
      title: 'Gezdirici (Dog Walker)',
      description: 'Günün dilediğiniz saatinde, GPS takip destekli ve deneyimli bakıcılar eşliğinde yürüyüş.',
      icon: '🦮',
      badge: 'Son Fazda',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/20',
    },
    {
      id: 'trainer',
      title: 'Eğitmen & Davranış',
      description: 'Temel itaat, sosyalleşme ve tuvalet eğitiminden ileri düzey problem davranış çözümlerine.',
      icon: '🎓',
      badge: 'Son Fazda',
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-500/20',
    },
    {
      id: 'petshop',
      title: 'Premium Can Dostu Mağazası',
      description: 'En kaliteli mamalar, sağlıklı ödül mamaları, oyuncaklar ve aksesuarlar en iyi fiyatlarla.',
      icon: '🛍️',
      badge: 'Son Fazda',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-500/20',
    },
    {
      id: 'sitter',
      title: 'Bakıcı (Can Dostu Bakıcısı)',
      description: 'Evinizde veya bakıcının evinde, can dostunuza özel ilgi ve sevgiyle bireysel bakım hizmeti.',
      icon: '🏠',
      badge: 'Çok Yakında',
      color: 'from-cyan-500/10 to-sky-500/10 text-cyan-600 border-cyan-500/20',
    },
    {
      id: 'insurance',
      title: 'Can Dostu Sigortası',
      description: 'Evcil hayvan sağlık sigortası ile beklenmedik veteriner masraflarına karşı güvence altında olun.',
      icon: '🛡️',
      badge: 'Çok Yakında',
      color: 'from-lime-500/10 to-green-500/10 text-lime-600 border-lime-500/20',
    },
    {
      id: 'photographer',
      title: 'Pet Fotoğrafçısı',
      description: 'Profesyonel evcil hayvan fotoğraf çekimleri ile can dostunuzun en özel anlarını ölümsüzleştirin.',
      icon: '📸',
      badge: 'Çok Yakında',
      color: 'from-fuchsia-500/10 to-pink-500/10 text-fuchsia-600 border-fuchsia-500/20',
    },
  ]

  return (
    <div className="flex flex-col gap-8 pb-20 w-full mx-auto font-sans animate-fadeInUp">
      
      {/* Back Link */}
      <div className="flex items-center px-2 -mb-4">
        <Link href="/owner/dashboard" className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors text-[14px] font-bold group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Ana Sayfa'ya Dön
        </Link>
      </div>

      {/* Hero Header */}
      <section className="card-base overflow-hidden relative shadow-lg shadow-primary/5 bg-white p-8 md:p-10 border border-border-main">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 via-primary to-violet-600" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-[12px] font-bold uppercase tracking-wider mb-3">
              ✨ Çok Yakında
            </div>
            <h1 className="text-[28px] md:text-[34px] font-black text-text-primary tracking-tight leading-none mb-3">
              Hizmetler & Rezervasyon
            </h1>
            <p className="text-text-secondary text-[15px] md:text-[16px] font-medium leading-relaxed">
              Odi.Pet ailesi olarak can dostunuzun tüm bakım, otel, gezdirme, eğitim ve alışveriş ihtiyaçlarını tek çatı altında topluyoruz. Seçkin üyelerimiz ile rezervasyon ve sipariş kurgusu en kısa sürede burada olacak.
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center text-primary text-[32px] shrink-0 shadow-inner">
            🤝
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[12px] font-black text-text-secondary uppercase tracking-widest px-2">
          Gelecek Hizmet Kategorileri
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="card-base p-6 flex gap-5 hover:border-primary/20 hover:scale-[1.01] hover:shadow-medium transition-all duration-300 relative overflow-hidden group bg-white border border-border-main"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color.split(' ')[0]} ${service.color.split(' ')[1]} flex items-center justify-center text-[28px] shrink-0 border border-transparent group-hover:scale-110 transition-transform duration-300`}>
                {service.icon}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-[18px] font-extrabold text-text-primary group-hover:text-primary transition-colors">
                      {service.title}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bg-main border text-text-secondary`}>
                      {service.badge}
                    </span>
                  </div>
                  <p className="text-[13px] md:text-[14px] text-text-secondary leading-relaxed font-medium">
                    {service.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Banner */}
      <section className="card-base p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10 rounded-2xl text-center">
        <p className="text-[14px] font-semibold text-text-secondary">
          Bölgemizdeki en iyi evcil hayvan uzmanlarını bir araya getirmek için çalışıyoruz. 🐾
        </p>
      </section>

    </div>
  )
}
