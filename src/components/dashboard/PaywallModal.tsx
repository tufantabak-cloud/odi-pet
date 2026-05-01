'use client'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  feature?: string
}

export function PaywallModal({ isOpen, onClose, title, description, feature }: PaywallModalProps) {
  if (!isOpen) return null

  const defaultTitle = 'Bu özellik PRO planına özeldir'
  const defaultDesc = 'Dostunuzun sağlığını riske atmayın. Alışkanlıkları kontrol altına almak ve detaylı analizleri görmek için PRO plana geçin.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-slideUp">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-bg-main hover:bg-black/5 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5 mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>

        <h2 className="text-[20px] font-black text-center text-text-primary mb-2">
          {title || defaultTitle}
        </h2>
        <p className="text-[14px] text-text-secondary text-center mb-6 leading-relaxed">
          {description || defaultDesc}
        </p>

        <div className="flex flex-col gap-3">
          <button className="btn-primary w-full py-3.5 text-[15px]">
            PRO Planı İncele
          </button>
          <button onClick={onClose} className="btn-outline w-full py-3.5 text-[15px]">
            Belki Daha Sonra
          </button>
        </div>
      </div>
    </div>
  )
}
