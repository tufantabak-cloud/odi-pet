export type CategoryKey =
  | 'asi' | 'parazit' | 'bakim'
  | 'beslenme' | 'hijyen' | 'aktivite' | 'saglik'

export const categoryThemes: Record<CategoryKey, {
  label: string
  gradient: string        // Tailwind gradient class
  progressColor: string   // hex, progress bar fill
  bgLight: string         // hex, ikon arka planı
  textColor: string       // hex, başlık rengi
}> = {
  asi: {
    label: 'Aşı',
    gradient: 'from-blue-400 to-cyan-500',
    progressColor: '#3B9FE8',
    bgLight: '#EBF5FF',
    textColor: '#1E6FB5',
  },
  parazit: {
    label: 'Parazit',
    gradient: 'from-green-400 to-emerald-500',
    progressColor: '#34C97A',
    bgLight: '#EAFAF1',
    textColor: '#1A6B3A',
  },
  bakim: {
    label: 'Bakım',
    gradient: 'from-pink-400 to-rose-500',
    progressColor: '#F06292',
    bgLight: '#FDE8F0',
    textColor: '#9B1B5A',
  },
  beslenme: {
    label: 'Beslenme',
    gradient: 'from-amber-400 to-orange-500',
    progressColor: '#F59E0B',
    bgLight: '#FFF8EB',
    textColor: '#9A4B00',
  },
  hijyen: {
    label: 'Hijyen',
    gradient: 'from-sky-400 to-blue-500',
    progressColor: '#38BDF8',
    bgLight: '#E8F5FE',
    textColor: '#1A4F7A',
  },
  aktivite: {
    label: 'Aktivite',
    gradient: 'from-orange-400 to-red-500',
    progressColor: '#F97316',
    bgLight: '#FFF0E8',
    textColor: '#9A2B00',
  },
  saglik: {
    label: 'Sağlık',
    gradient: 'from-red-400 to-rose-600',
    progressColor: '#EF4444',
    bgLight: '#FEECEC',
    textColor: '#8B1A1A',
  },
}
