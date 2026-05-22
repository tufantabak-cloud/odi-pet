import React from 'react'

export const metadata = {
  title: 'Sosyal İçerik Moderasyonu — ODI Admin',
}

export default async function AdminSocialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
          📱 Sosyal İçerik Moderasyonu
        </h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Topluluk tarafından paylaşılan Odi.Pet sosyal gönderilerinin incelendiği ve modere edildiği alan.
        </p>
      </div>

      <div className="p-12 text-center border border-border-main rounded-2xl bg-surface">
        <span className="text-[40px] mb-4 block">🚧</span>
        <h2 className="text-lg font-bold text-text-primary">Yapım Aşamasında</h2>
        <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
          Sosyal postların (social_posts tablosu) görüntülenme, düzenlenme ve uygunsuz içerik bildirimlerini inceleme altyapısı bu sayfada aktif edilecektir.
        </p>
      </div>
    </div>
  )
}
