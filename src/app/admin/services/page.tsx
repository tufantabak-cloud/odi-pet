import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Hizmetler Yönetimi — ODI Admin',
}

export default async function AdminServicesPage() {
  // Mock data for services
  const services = [
    { id: 1, name: 'Odi AI-Vet', description: '7/24 yapay zeka destekli veteriner danışmanlık hizmeti.', status: 'active', icon: '🤖' },
    { id: 2, name: 'Pet Taksi', description: 'Güvenilir ve konforlu evcil hayvan taşıma hizmeti.', status: 'active', icon: '🚕' },
    { id: 3, name: 'Grooming (Kuaför)', description: 'Profesyonel evcil hayvan kuaför ve bakım hizmetleri.', status: 'inactive', icon: '✂️' },
    { id: 4, name: 'Mobil Veteriner', description: 'Evinize gelen uzman veteriner hekim hizmeti.', status: 'maintenance', icon: '🩺' },
    { id: 5, name: 'Pet Oteli', description: 'Güvenli ve konforlu evcil hayvan konaklama tesisleri.', status: 'inactive', icon: '🏨' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            🛠️ Hizmetler Yönetimi
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Uygulama içinde sunulan platform hizmetlerini yönetin, aktif/pasif durumlarını değiştirin.
          </p>
        </div>
        <button className="btn-primary py-2 px-4 rounded-xl font-bold text-[13px] flex items-center gap-2 shadow-sm">
          <span className="text-[16px] leading-none">+</span> Yeni Hizmet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div key={service.id} className="p-5 border border-border-main rounded-2xl bg-surface flex flex-col hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-[20px]">
                  {service.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-text-primary">{service.name}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md mt-0.5 inline-block
                    ${service.status === 'active' ? 'bg-green-100 text-green-700' : 
                      service.status === 'inactive' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                    {service.status === 'active' ? 'Aktif' : service.status === 'inactive' ? 'Pasif' : 'Bakımda'}
                  </span>
                </div>
              </div>
              
              {/* Mock Toggle Switch */}
              <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${service.status === 'active' ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all shadow-sm ${service.status === 'active' ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            
            <p className="text-[13px] text-text-secondary mt-3 line-clamp-2">
              {service.description}
            </p>

            <div className="mt-4 pt-4 border-t border-border-main flex justify-end gap-2">
              <button className="px-3 py-1.5 text-[12px] font-bold text-text-secondary hover:text-primary transition-colors">
                Düzenle
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
