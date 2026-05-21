import Link from 'next/link'

export default function SocialPage() {
  return (
    <div className="flex flex-col gap-8 pb-20 w-full mx-auto font-sans animate-fadeInUp">
      
      {/* Hero Header */}
      <section className="card-base overflow-hidden relative shadow-lg shadow-primary/5 bg-white p-8 md:p-10 border border-border-main text-center">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 via-primary to-violet-600" />
        <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-[12px] font-bold uppercase tracking-wider mb-4">
            📣 Sonraki Fazlar
          </div>
          <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-primary text-[42px] mb-5 shadow-inner animate-bounce">
            🎈
          </div>
          <h1 className="text-[28px] md:text-[36px] font-black text-text-primary tracking-tight leading-none mb-4">
            Odi.Pet Sosyal Dünyası
          </h1>
          <p className="text-text-secondary text-[15px] md:text-[16px] font-medium leading-relaxed mb-6">
            Diğer evcil hayvan sahipleriyle tanışabileceğiniz, pati dostunuz için oyun arkadaşları (playdate) bulabileceğiniz, deneyimlerinizi paylaşabileceğiniz ve topluluk etkinliklerine katılabileceğiniz sosyal ağımız sonraki aşamalarda burada yerini alacak!
          </p>
          <div className="w-full h-px bg-border-main my-4" />
          <p className="text-[13px] font-bold text-text-secondary uppercase tracking-widest">
            Neler Planlıyoruz?
          </p>
        </div>
      </section>

      {/* Features Outline */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-base p-6 text-center bg-white border border-border-main">
          <div className="text-[32px] mb-2">🐾</div>
          <h3 className="text-[16px] font-extrabold text-text-primary mb-1">Playdate Bulucu</h3>
          <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
            Yakındaki uyumlu köpek veya kedilerle güvenli oyun buluşmaları planlayın.
          </p>
        </div>
        <div className="card-base p-6 text-center bg-white border border-border-main">
          <div className="text-[32px] mb-2">💬</div>
          <h3 className="text-[16px] font-extrabold text-text-primary mb-1">Pati Forumları</h3>
          <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
            Beslenme, eğitim ve sağlık konularında deneyimli sahiplerin tecrübelerinden faydalanın.
          </p>
        </div>
        <div className="card-base p-6 text-center bg-white border border-border-main">
          <div className="text-[32px] mb-2">🏆</div>
          <h3 className="text-[16px] font-extrabold text-text-primary mb-1">Etkinlikler</h3>
          <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
            Şehrinizdeki evcil hayvan şenlikleri, eğitim seminerleri ve buluşmalardan haberdar olun.
          </p>
        </div>
      </section>

      {/* Action / Back to Dashboard */}
      <div className="flex justify-center mt-2">
        <Link href="/owner/dashboard" className="btn-primary flex items-center gap-2 text-[14px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Ana Sayfaya Dön
        </Link>
      </div>

    </div>
  )
}
