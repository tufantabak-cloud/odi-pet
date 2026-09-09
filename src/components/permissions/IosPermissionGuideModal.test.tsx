import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import IosPermissionGuideModal from './IosPermissionGuideModal'

describe('IosPermissionGuideModal — iPhone Web Permissions & PWA Guide Suite', () => {
  it('does not render markup when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <IosPermissionGuideModal
        isOpen={false}
        onClose={vi.fn()}
        onContinue={vi.fn()}
      />
    )
    expect(html).toBe('')
  })

  it('renders all 4 instructions and headers when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <IosPermissionGuideModal
        isOpen={true}
        onClose={vi.fn()}
        onContinue={vi.fn()}
      />
    )

    // Header and description
    expect(html).toContain('iPhone Ana Ekrana Ekleme ve İzin Kılavuzu')
    expect(html).toContain(
      "iPhone&#x27;larda web sitelerinin doğrudan bildirim gönderebilmesi için sitenin önce ana ekrana uygulama gibi eklenmesi gerekiyor."
    )

    // Step 1: Paylaş Menüsünü Açın
    expect(html).toContain('Paylaş Menüsünü Açın:')
    expect(html).toContain('Safari&#x27;nin en altındaki araç çubuğunda yer alan')

    // Step 2: Ana Ekrana Ekleyin
    expect(html).toContain('Ana Ekrana Ekleyin:')
    expect(html).toContain('&quot;Ana Ekrana Ekle&quot;')

    // Step 3: Uygulamayı Açın
    expect(html).toContain('Uygulamayı Açın:')
    expect(html).toContain('Telefonunuzun ana ekranına eklenen yeni simgeye dokunarak uygulamayı açın.')

    // Step 4: Bildirimleri Onaylayın
    expect(html).toContain('Bildirimleri Onaylayın:')
    expect(html).toContain('Bildirimleri Etkinleştir ve Devam Et')
    expect(html).toContain('İzin Ver')

    // Fallback notice
    expect(html).toContain(
      'Şu an ana ekrana eklemeden doğrudan devam etmek isterseniz de alttaki mor'
    )
    expect(html).toContain('ancak iOS kısıtlaması nedeniyle anlık bildirimler gelmeyebilir.')

    // Button label
    expect(html).toContain('Bildirimleri Etkinleştir ve Devam Et')
  })

  it('renders submitting state correctly', () => {
    const html = renderToStaticMarkup(
      <IosPermissionGuideModal
        isOpen={true}
        onClose={vi.fn()}
        onContinue={vi.fn()}
        isSubmitting={true}
      />
    )

    expect(html).toContain('Bildirimler Etkinleştiriliyor...')
  })
})
