import React from 'react'

export const metadata = {
  title: 'Veteriner Onayları ve Yönetimi — ODI Admin',
}

export default async function AdminVetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
          🩺 Veteriner Onayları ve Yönetimi
        </h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Sisteme kayıtlı veteriner hekimlerin, klinik bilgilerinin ve resmi belgelerinin incelendiği alan.
        </p>
      </div>

      <div className="p-12 text-center border border-border-main rounded-2xl bg-surface">
        <span className="text-[40px] mb-4 block">🚧</span>
        <h2 className="text-lg font-bold text-text-primary">Yapım Aşamasında</h2>
        <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
          Vets, Vet_Verifications ve Vet_Reviews tabloları üzerinden veteriner onay/red mekanizmaları, lisans kontrolleri ve puanlama işlemleri burada devreye alınacaktır.
        </p>
      </div>
    </div>
  )
}
