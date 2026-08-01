const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'public', 'brand', 'illustrations');

// Define color tokens matching OPOS
const COLORS = {
  primary: '#3800A4',
  primaryContainer: '#4F2DBA',
  background: '#FAF8FF',
  surface: '#FFFFFF',
  textPrimary: '#1A1B20',
  textSecondary: '#697386',
  medical: '#3B9FE8',
  parasite: '#34C97A',
  nutrition: '#F59E0B',
  health: '#EF4444',
  grooming: '#F06292',
  vet: '#4F46E5',
  hygiene: '#38BDF8',
  activity: '#F97316',
};

// Reusable SVG defs (gradients & filters)
const COMMON_DEFS = `
  <defs>
    <!-- Filters for Semi-3D Depth -->
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.08" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.04" />
    </filter>
    <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#4F2DBA" flood-opacity="0.25" />
    </filter>
    <filter id="glow-teal" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#38BDF8" flood-opacity="0.25" />
    </filter>
    <filter id="glass-blur">
      <feGaussianBlur stdDeviation="8" />
    </filter>

    <!-- Gradients -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF8FF" />
      <stop offset="100%" stop-color="#EEEDF4" />
    </linearGradient>

    <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F2DBA" />
      <stop offset="100%" stop-color="#3800A4" />
    </linearGradient>

    <linearGradient id="medical-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#3B9FE8" />
    </linearGradient>

    <linearGradient id="parasite-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ADE80" />
      <stop offset="100%" stop-color="#34C97A" />
    </linearGradient>

    <linearGradient id="nutrition-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>

    <linearGradient id="grooming-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F472B6" />
      <stop offset="100%" stop-color="#F06292" />
    </linearGradient>

    <linearGradient id="health-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F87171" />
      <stop offset="100%" stop-color="#EF4444" />
    </linearGradient>

    <linearGradient id="vet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>

    <linearGradient id="glass-card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.7" />
    </linearGradient>
  </defs>
`;

// Helper SVG Paw Element
const PAW_SYMBOL = `
  <g class="paw-icon">
    <ellipse cx="0" cy="8" rx="8" ry="10" fill="currentColor"/>
    <ellipse cx="-11" cy="-4" rx="4" ry="5.5" fill="currentColor"/>
    <ellipse cx="-4" cy="-11" rx="4" ry="5.5" fill="currentColor"/>
    <ellipse cx="4" cy="-11" rx="4" ry="5.5" fill="currentColor"/>
    <ellipse cx="11" cy="-4" rx="4" ry="5.5" fill="currentColor"/>
  </g>
`;

// Illustrations definitions map per folder
const ILLUSTRATIONS = {
  'empty-state': [
    {
      name: 'empty-no-pets.svg',
      title: 'Henüz Dost Eklenmedi',
      desc: 'Evcil dostunuzun profilini oluşturun',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <!-- Decorative Background Circles -->
          <circle cx="200" cy="130" r="85" fill="#E6DEFF" opacity="0.4"/>
          <circle cx="200" cy="130" r="65" fill="#FFFFFF" opacity="0.8" filter="url(#soft-shadow)"/>
          
          <!-- Glass Card Plate -->
          <rect x="110" y="70" width="180" height="120" rx="20" fill="url(#glass-card-grad)" stroke="#FFFFFF" stroke-width="2" filter="url(#soft-shadow)"/>
          
          <!-- Pet Leash / Collar Graphic -->
          <path d="M160 120 C 160 95, 240 95, 240 120 C 240 145, 160 145, 160 120 Z" fill="none" stroke="url(#primary-grad)" stroke-width="6" stroke-dasharray="8 6" stroke-linecap="round"/>
          <circle cx="200" cy="142" r="14" fill="url(#nutrition-grad)" filter="url(#glow-purple)"/>
          <g transform="translate(200, 142) scale(0.6)" fill="#FFFFFF">${PAW_SYMBOL}</g>
          
          <!-- Plus Action Badge -->
          <circle cx="260" cy="85" r="16" fill="url(#primary-grad)" filter="url(#glow-purple)"/>
          <path d="M260 77 V93 M252 85 H268" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
          
          <!-- Labels -->
          <text x="200" y="225" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Henüz Dost Eklenmedi</text>
          <text x="200" y="248" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">İlk evcil dostunuzu ekleyerek başlayın</text>
        </svg>
      `
    },
    {
      name: 'empty-no-vaccines.svg',
      title: 'Aşı Kaydı Bulunmuyor',
      desc: 'Aşı takvimini dijitalleştirin',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="125" r="75" fill="#E0F2FE" opacity="0.5"/>
          
          <!-- Syringe & Medical Shield -->
          <rect x="130" y="65" width="140" height="120" rx="20" fill="url(#glass-card-grad)" stroke="#FFFFFF" stroke-width="2" filter="url(#soft-shadow)"/>
          
          <!-- Vaccine Vial -->
          <rect x="175" y="95" width="30" height="50" rx="6" fill="url(#medical-grad)"/>
          <rect x="170" y="90" width="40" height="8" rx="3" fill="#0EA5E9"/>
          <path d="M185 105 H195 M185 115 H195 M185 125 H195" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
          
          <!-- Shield Badge -->
          <circle cx="230" cy="140" r="16" fill="url(#parasite-grad)"/>
          <path d="M225 140 L229 144 L236 136" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          
          <text x="200" y="225" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Aşı Kaydı Bulunmuyor</text>
          <text x="200" y="248" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Dostunuzun aşı takvimini hemen oluşturun</text>
        </svg>
      `
    },
    {
      name: 'empty-no-food.svg',
      title: 'Mama Planı Yok',
      desc: 'Günlük beslenme programı ekleyin',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="125" r="75" fill="#FEF3C7" opacity="0.5"/>
          
          <!-- Food Bowl -->
          <ellipse cx="200" cy="145" rx="55" ry="20" fill="url(#nutrition-grad)" filter="url(#soft-shadow)"/>
          <path d="M145 145 C145 175, 255 175, 255 145 Z" fill="url(#nutrition-grad)"/>
          <ellipse cx="200" cy="145" rx="45" ry="14" fill="#D97706"/>
          
          <!-- Fish Bone Icon -->
          <path d="M180 120 L220 120 M190 112 L190 128 M200 110 L200 130 M210 112 L210 128" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
          
          <text x="200" y="225" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Beslenme Planı Boş</text>
          <text x="200" y="248" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Günlük mama porsiyonunu ve saatlerini ayarlayın</text>
        </svg>
      `
    }
  ],

  'onboarding': [
    {
      name: 'onboarding-welcome.svg',
      title: "Odi.Pet'e Hoş Geldiniz",
      desc: 'Evcil dostunuzun tüm ihtiyaçları tek uygulamada',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="500" height="350" rx="28" fill="url(#bg-grad)"/>
          
          <!-- Big Central Glass Shield with Paw and Heart -->
          <rect x="150" y="50" width="200" height="200" rx="36" fill="url(#glass-card-grad)" stroke="#FFFFFF" stroke-width="3" filter="url(#soft-shadow)"/>
          
          <!-- Pet Paw Center -->
          <circle cx="250" cy="140" r="45" fill="url(#primary-grad)" filter="url(#glow-purple)"/>
          <g transform="translate(250, 140) scale(1.6)" fill="#FFFFFF">${PAW_SYMBOL}</g>
          
          <!-- Floating Heart & Sparkles -->
          <circle cx="330" cy="80" r="20" fill="url(#grooming-grad)" filter="url(#soft-shadow)"/>
          <path d="M330 75 C325 70, 317 75, 330 87 C343 75, 335 70, 330 75 Z" fill="#FFFFFF"/>
          
          <circle cx="160" cy="200" r="18" fill="url(#parasite-grad)"/>
          <path d="M153 200 L158 205 L167 195" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
          
          <text x="250" y="280" font-family="Montserrat, sans-serif" font-weight="800" font-size="20" fill="${COLORS.primary}" text-anchor="middle">Odi.Pet Ekosistemine Hoş Geldiniz</text>
          <text x="250" y="308" font-family="Montserrat, sans-serif" font-weight="500" font-size="14" fill="${COLORS.textSecondary}" text-anchor="middle">Sağlık, aşı, beslenme ve acil durum takibinde en akıllı dostunuz</text>
        </svg>
      `
    }
  ],

  'dashboard': [
    {
      name: 'dashboard-hero.svg',
      title: 'Bugünün Özeti',
      desc: 'Dostunuz için günlük görevler ve hatırlatmalar',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="600" height="300" rx="28" fill="url(#primary-grad)"/>
          
          <!-- Soft Background Patterns -->
          <circle cx="500" cy="60" r="120" fill="#FFFFFF" opacity="0.06"/>
          <circle cx="100" cy="250" r="90" fill="#FFFFFF" opacity="0.04"/>
          
          <!-- Glass Banner Content -->
          <rect x="40" y="40" width="520" height="220" rx="24" fill="url(#glass-card-grad)" opacity="0.15" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="2"/>
          
          <g transform="translate(80, 110)">
            <text font-family="Montserrat, sans-serif" font-weight="800" font-size="24" fill="#FFFFFF">Günaydın, Tufan! 🐾</text>
            <text y="32" font-family="Montserrat, sans-serif" font-weight="500" font-size="15" fill="#E6DEFF">Dostlarınızın tüm bakımları ve aşıları güncel.</text>
          </g>
          
          <!-- Floating Widget -->
          <rect x="380" y="70" width="150" height="160" rx="20" fill="#FFFFFF" filter="url(#soft-shadow)"/>
          <circle cx="455" cy="120" r="30" fill="url(#parasite-grad)"/>
          <path d="M445 120 L452 127 L465 114" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="455" y="175" font-family="Montserrat, sans-serif" font-weight="700" font-size="13" fill="${COLORS.textPrimary}" text-anchor="middle">100% Tamamlandı</text>
          <text x="455" y="195" font-family="Montserrat, sans-serif" font-weight="500" font-size="11" fill="${COLORS.textSecondary}" text-anchor="middle">Günlük Rutin</text>
        </svg>
      `
    }
  ],

  'health': [
    {
      name: 'health-checkup.svg',
      title: 'Genel Sağlık Taraması',
      desc: 'Kilo, ateş ve vital bulgu kayıtları',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <!-- Heart Pulse Card -->
          <rect x="100" y="60" width="200" height="140" rx="24" fill="url(#glass-card-grad)" stroke="#FFFFFF" stroke-width="2" filter="url(#soft-shadow)"/>
          
          <path d="M120 130 H160 L170 100 L185 160 L200 110 L215 140 L225 130 H280" stroke="url(#health-grad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          
          <circle cx="200" cy="180" r="22" fill="url(#health-grad)" filter="url(#soft-shadow)"/>
          <path d="M200 173 C196 168, 189 173, 200 184 C211 173, 204 168, 200 173 Z" fill="#FFFFFF"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Sağlık Metrikleri</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Vital değerler ve muayene geçmişi</text>
        </svg>
      `
    }
  ],

  'vaccines': [
    {
      name: 'vaccine-schedule.svg',
      title: 'Dijital Aşı Karnesi',
      desc: 'Yaklaşan aşı ve doz takviminiz',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <!-- Passport / Vaccine Card -->
          <rect x="110" y="50" width="180" height="150" rx="20" fill="url(#medical-grad)" filter="url(#soft-shadow)"/>
          <rect x="125" y="65" width="150" height="120" rx="14" fill="#FFFFFF" opacity="0.9"/>
          
          <!-- Syringe Icon & Checkmark -->
          <circle cx="200" cy="115" r="28" fill="url(#primary-grad)"/>
          <path d="M192 115 L198 121 L209 109" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Akıllı Aşı Takvimi</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Zamanı gelen aşılar için anlık bildirim</text>
        </svg>
      `
    }
  ],

  'parasite': [
    {
      name: 'parasite-control.svg',
      title: 'Parazit Kontrolü',
      desc: 'İç ve dış parazit damla takibi',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="120" r="70" fill="#DCFCE7" opacity="0.6"/>
          
          <!-- Shield & Drop -->
          <path d="M200 65 L250 85 V135 C250 165, 200 185, 200 185 C200 185, 150 165, 150 135 V85 Z" fill="url(#parasite-grad)" filter="url(#soft-shadow)"/>
          
          <!-- Water / Medicine Drop -->
          <path d="M200 105 C200 105, 215 130, 215 140 C215 148, 208 155, 200 155 C192 155, 185 148, 185 140 C185 130, 200 105, 200 105 Z" fill="#FFFFFF"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Parazit Koruması</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Düzenli periyotlarla tam koruma</text>
        </svg>
      `
    }
  ],

  'nutrition': [
    {
      name: 'nutrition-plan.svg',
      title: 'Dengeli Beslenme',
      desc: 'Kalori ve mama takip sistemi',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="125" r="70" fill="#FEF3C7" opacity="0.6"/>
          
          <rect x="130" y="70" width="140" height="110" rx="20" fill="url(#glass-card-grad)" stroke="#FFFFFF" stroke-width="2" filter="url(#soft-shadow)"/>
          
          <path d="M150 140 Q200 170 250 140" stroke="url(#nutrition-grad)" stroke-width="8" stroke-linecap="round"/>
          <circle cx="200" cy="110" r="20" fill="url(#nutrition-grad)"/>
          <g transform="translate(200, 110) scale(0.7)" fill="#FFFFFF">${PAW_SYMBOL}</g>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Beslenme Yönetimi</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Irk ve kiloya özel porsiyonlama</text>
        </svg>
      `
    }
  ],

  'grooming': [
    {
      name: 'grooming-care.svg',
      title: 'Tüy ve Bakım',
      desc: 'Kuaför ve hijyen randevuları',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="120" r="70" fill="#FCE7F3" opacity="0.6"/>
          
          <!-- Comb / Scissor Icon Badge -->
          <rect x="130" y="70" width="140" height="110" rx="20" fill="url(#glass-card-grad)" stroke="#FFFFFF" stroke-width="2" filter="url(#soft-shadow)"/>
          
          <circle cx="200" cy="125" r="28" fill="url(#grooming-grad)"/>
          <path d="M190 120 L210 130 M190 130 L210 120" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Bakım ve Hijyen</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Tarak, banyo ve tırnak kesim rutinleri</text>
        </svg>
      `
    }
  ],

  'community': [
    {
      name: 'community-share.svg',
      title: 'Patili Topluluk',
      desc: 'Deneyim paylaşımı ve arkadaşlık',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="160" cy="120" r="45" fill="url(#primary-grad)" opacity="0.8"/>
          <circle cx="240" cy="120" r="45" fill="url(#grooming-grad)" opacity="0.8"/>
          <circle cx="200" cy="100" r="35" fill="url(#nutrition-grad)"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Odi.Pet Topluluğu</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Diğer evcil hayvan sahipleriyle iletişim</text>
        </svg>
      `
    }
  ],

  'marketplace': [
    {
      name: 'marketplace-empty.svg',
      title: 'Odi.Pet Mağaza',
      desc: 'Onaylı mama, oyuncak ve aksesuarlar',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <!-- Shopping Bag with Paw -->
          <rect x="140" y="80" width="120" height="110" rx="16" fill="url(#primary-grad)" filter="url(#soft-shadow)"/>
          <path d="M170 80 V65 C170 55, 230 55, 230 65 V80" fill="none" stroke="url(#primary-grad)" stroke-width="5" stroke-linecap="round"/>
          <g transform="translate(200, 135) scale(0.8)" fill="#FFFFFF">${PAW_SYMBOL}</g>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Odi.Pet Pazaryeri</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Veteriner onaylı ürünler yakında burada</text>
        </svg>
      `
    }
  ],

  'services': [
    {
      name: 'services-vet-finder.svg',
      title: 'Nöbetçi Veteriner Haritası',
      desc: 'En yakın klinik ve acil destek',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <!-- Map Pin with Medical Cross -->
          <path d="M200 55 C165 55, 140 80, 140 115 C140 160, 200 200, 200 200 C200 200, 260 160, 260 115 C260 80, 235 55, 200 55 Z" fill="url(#vet-grad)" filter="url(#soft-shadow)"/>
          <circle cx="200" cy="110" r="22" fill="#FFFFFF"/>
          <path d="M200 98 V122 M188 110 H212" stroke="url(#vet-grad)" stroke-width="5" stroke-linecap="round"/>
          
          <text x="200" y="240" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Veteriner Bulucu</text>
          <text x="200" y="262" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">7/24 Konum bazlı klinik arama</text>
        </svg>
      `
    }
  ],

  'profile': [
    {
      name: 'profile-pet-card.svg',
      title: 'Dijital Kimlik (SmartCard)',
      desc: 'Mikroçip ve künye bilgileri',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <rect x="100" y="60" width="200" height="130" rx="20" fill="url(#primary-grad)" filter="url(#soft-shadow)"/>
          <circle cx="150" cy="110" r="24" fill="#FFFFFF"/>
          <g transform="translate(150, 110) scale(0.6)" fill="${COLORS.primary}">${PAW_SYMBOL}</g>
          
          <rect x="190" y="95" width="80" height="8" rx="4" fill="#FFFFFF" opacity="0.9"/>
          <rect x="190" y="112" width="50" height="6" rx="3" fill="#FFFFFF" opacity="0.6"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Pet SmartCard</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Tüm biyometrik ve çip bilgileri tek kartta</text>
        </svg>
      `
    }
  ],

  'settings': [
    {
      name: 'settings-preferences.svg',
      title: 'Uygulama Ayarları',
      desc: 'Bildirim ve güvenlik tercihleri',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="120" r="50" fill="url(#glass-card-grad)" stroke="url(#primary-grad)" stroke-width="4" filter="url(#soft-shadow)"/>
          <circle cx="200" cy="120" r="20" fill="url(#primary-grad)"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Kişiselleştirme</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Hatırlatıcı ve hesap yönetimi</text>
        </svg>
      `
    }
  ],

  'admin': [
    {
      name: 'admin-analytics.svg',
      title: 'Sistem Yönetimi',
      desc: 'Dinamik panel ve analitik',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <rect x="110" y="60" width="180" height="120" rx="16" fill="url(#glass-card-grad)" stroke="#FFFFFF" stroke-width="2" filter="url(#soft-shadow)"/>
          <path d="M130 140 L160 110 L190 130 L230 90 L270 120" stroke="url(#primary-grad)" stroke-width="4" stroke-linecap="round" fill="none"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Yönetici Paneli</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Canlı sistem metrikleri ve yönetim</text>
        </svg>
      `
    }
  ],

  'ai': [
    {
      name: 'ai-vet-assistant.svg',
      title: 'Odi AI Vet Asistanı',
      desc: '7/24 Akıllı sağlık danışmanı',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <!-- AI Sparkle Orb -->
          <circle cx="200" cy="120" r="55" fill="url(#primary-grad)" filter="url(#glow-purple)"/>
          
          <!-- Stethoscope/Sparkle Overlay -->
          <path d="M185 120 L200 105 L215 120 L200 135 Z" fill="#FFFFFF"/>
          <circle cx="170" cy="95" r="6" fill="#38BDF8"/>
          <circle cx="230" cy="145" r="8" fill="#F06292"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Odi AI Vet</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Yapay zeka destekli ilk semptom analizi</text>
        </svg>
      `
    }
  ],

  'notifications': [
    {
      name: 'notification-reminder.svg',
      title: 'Akıllı Hatırlatıcı',
      desc: 'Aşı ve ilaç zamanı geldiğinde haber verir',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <path d="M200 65 C175 65, 160 85, 160 115 V145 L145 160 H255 L240 145 V115 C240 85, 225 65, 200 65 Z" fill="url(#nutrition-grad)" filter="url(#soft-shadow)"/>
          <circle cx="200" cy="180" r="10" fill="#D97706"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Anlık Bildirimler</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Kritik takvim uyarılarını kaçırmayın</text>
        </svg>
      `
    }
  ],

  'success': [
    {
      name: 'success-check.svg',
      title: 'İşlem Başarılı',
      desc: 'Kaydınız başarıyla güncellendi',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="120" r="55" fill="url(#parasite-grad)" filter="url(#soft-shadow)"/>
          <path d="M178 120 L193 135 L223 105" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Harika!</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">İşlem başarıyla tamamlandı</text>
        </svg>
      `
    }
  ],

  'error': [
    {
      name: 'error-warning.svg',
      title: 'Bir Hata Oluştu',
      desc: 'Lütfen tekrar deneyin',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="120" r="55" fill="url(#health-grad)" filter="url(#soft-shadow)"/>
          <path d="M185 105 L215 135 M215 105 L185 135" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Bağlantı Uyarısı</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">İşlem sırasında beklenmeyen bir hata oluştu</text>
        </svg>
      `
    }
  ],

  'offline': [
    {
      name: 'offline-no-connection.svg',
      title: 'Çevrimdışı Mod (PWA)',
      desc: 'İnternet bağlantısı yok, verileriniz yerelde güvende',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="120" r="50" fill="url(#glass-card-grad)" stroke="${COLORS.textSecondary}" stroke-width="3" filter="url(#soft-shadow)"/>
          <path d="M170 150 L230 90" stroke="${COLORS.textSecondary}" stroke-width="4" stroke-linecap="round"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">İnternet Bağlantısı Yok</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Serwist PWA sayesinde verileriniz saklanıyor</text>
        </svg>
      `
    }
  ],

  'maintenance': [
    {
      name: 'maintenance-mode.svg',
      title: 'Sistem Bakımda',
      desc: 'Sizlere daha iyi hizmet vermek için yenileniyoruz',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <rect x="130" y="70" width="140" height="100" rx="16" fill="url(#primary-grad)" filter="url(#soft-shadow)"/>
          <path d="M165 120 L235 120 M200 85 V155" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Kısa Bir Mola</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Odi.Pet altyapısı güncelleniyor</text>
        </svg>
      `
    }
  ],

  'seasonal': [
    {
      name: 'seasonal-banner.svg',
      title: 'Mevsimsel Bakım Reberi',
      desc: 'Yaz ve kış aylarına özel evcil hayvan önerileri',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <circle cx="200" cy="120" r="55" fill="url(#nutrition-grad)" filter="url(#glow-purple)"/>
          <path d="M200 80 V160 M160 120 H240" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Mevsimsel Öneriler</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Hava değişimlerine özel sağlık ipuçları</text>
        </svg>
      `
    }
  ],

  'marketing': [
    {
      name: 'marketing-banner.svg',
      title: 'Odi.Pet PRO Deneyimi',
      desc: 'Sınırsız dost profili ve gelişmiş takvim',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="500" height="250" rx="24" fill="url(#primary-grad)"/>
          
          <circle cx="400" cy="125" r="90" fill="#FFFFFF" opacity="0.08"/>
          
          <g transform="translate(50, 90)">
            <text font-family="Montserrat, sans-serif" font-weight="800" font-size="22" fill="#FFFFFF">Odi.Pet PRO'ya Geçin</text>
            <text y="28" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="#E6DEFF">Sınırsız evcil hayvan takibi ve AI desteği</text>
          </g>
          
          <circle cx="400" cy="125" r="40" fill="url(#nutrition-grad)" filter="url(#soft-shadow)"/>
          <text x="400" y="132" font-family="Montserrat, sans-serif" font-weight="900" font-size="18" fill="#FFFFFF" text-anchor="middle">PRO</text>
        </svg>
      `
    }
  ],

  'documents': [
    {
      name: 'document-health-report.svg',
      title: 'Sağlık Raporu PDF',
      desc: 'Veteriner hekimler için resmi çıktı',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <rect x="130" y="55" width="140" height="150" rx="14" fill="#FFFFFF" stroke="${COLORS.primary}" stroke-width="2" filter="url(#soft-shadow)"/>
          <line x1="150" y1="85" x2="230" y2="85" stroke="${COLORS.textSecondary}" stroke-width="3" stroke-linecap="round"/>
          <line x1="150" y1="105" x2="210" y2="105" stroke="${COLORS.textSecondary}" stroke-width="3" stroke-linecap="round"/>
          <line x1="150" y1="125" x2="240" y2="125" stroke="${COLORS.textSecondary}" stroke-width="3" stroke-linecap="round"/>
          
          <circle cx="230" cy="165" r="18" fill="url(#primary-grad)"/>
          <g transform="translate(230, 165) scale(0.5)" fill="#FFFFFF">${PAW_SYMBOL}</g>
          
          <text x="200" y="240" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Resmi Sağlık Raporu</text>
          <text x="200" y="262" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Tek tıkla PDF indir ve paylaş</text>
        </svg>
      `
    }
  ],

  'certificates': [
    {
      name: 'certificate-vaccine.svg',
      title: 'Aşı Tamamlama Sertifikası',
      desc: 'Resmi dijital onay belgesi',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="300" rx="24" fill="url(#bg-grad)"/>
          
          <rect x="100" y="50" width="200" height="150" rx="18" fill="url(#glass-card-grad)" stroke="url(#nutrition-grad)" stroke-width="4" filter="url(#soft-shadow)"/>
          
          <circle cx="200" cy="115" r="30" fill="url(#nutrition-grad)"/>
          <polygon points="200,95 206,108 220,110 210,120 213,134 200,127 187,134 190,120 180,110 194,108" fill="#FFFFFF"/>
          
          <text x="200" y="235" font-family="Montserrat, sans-serif" font-weight="700" font-size="16" fill="${COLORS.textPrimary}" text-anchor="middle">Sağlık Sertifikası</text>
          <text x="200" y="258" font-family="Montserrat, sans-serif" font-weight="500" font-size="13" fill="${COLORS.textSecondary}" text-anchor="middle">Dostunuzun aşı takvimi onaylandı</text>
        </svg>
      `
    }
  ],

  'backgrounds': [
    {
      name: 'background-lilac-glow.svg',
      title: 'Lilac Glow Arka Plan',
      desc: 'Odi.Pet soft glassmorphism zemin',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="800" height="600" fill="#FAF8FF"/>
          <circle cx="150" cy="150" r="250" fill="#4F2DBA" opacity="0.08" filter="url(#glass-blur)"/>
          <circle cx="650" cy="450" r="300" fill="#38BDF8" opacity="0.06" filter="url(#glass-blur)"/>
          <circle cx="700" cy="100" r="200" fill="#FC6AAE" opacity="0.05" filter="url(#glass-blur)"/>
        </svg>
      `
    }
  ],

  'decorations': [
    {
      name: 'decoration-paw-pattern.svg',
      title: 'Pati Desen Kaplaması',
      desc: 'Arka plan ve kart süslemeleri',
      render: () => `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
          ${COMMON_DEFS}
          <rect width="400" height="400" fill="transparent"/>
          <g fill="${COLORS.primary}" opacity="0.06">
            <g transform="translate(60, 60) scale(1.2)">${PAW_SYMBOL}</g>
            <g transform="translate(240, 100) scale(0.9)">${PAW_SYMBOL}</g>
            <g transform="translate(120, 260) scale(1.0)">${PAW_SYMBOL}</g>
            <g transform="translate(320, 300) scale(1.4)">${PAW_SYMBOL}</g>
          </g>
        </svg>
      `
    }
  ]
};

// Generate missing folders and create SVGs
let totalGenerated = 0;

Object.keys(ILLUSTRATIONS).forEach(folder => {
  const dirPath = path.join(baseDir, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  ILLUSTRATIONS[folder].forEach(item => {
    const filePath = path.join(dirPath, item.name);
    fs.writeFileSync(filePath, item.render().trim(), 'utf8');
    console.log(`Generated: ${folder}/${item.name}`);
    totalGenerated++;
  });
});

console.log(`\nOPOS Phase 1.5 Illustration System successfully generated! Total SVGs created: ${totalGenerated}`);
