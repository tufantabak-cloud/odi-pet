'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Genel Bakış',
    items: [{ href: '/admin', label: 'Panel', icon: '🏠' }]
  },
  {
    title: 'Yönetim',
    items: [
      { href: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
      { href: '/admin/pets', label: 'Evcil Hayvanlar', icon: '🐾' }
    ]
  },
  {
    title: 'Platform Servisleri',
    items: [
      { href: '/admin/content', label: 'İçerik Yönetimi', icon: '📚' },
      { href: '/admin/ai-vet', label: 'AI-Vet Analiz', icon: '🤖' },
      { href: '/admin/vaccines', label: 'Aşı Protokolleri', icon: '💉' },
      { href: '/admin/parasite-products', label: 'Parazit Ürünleri', icon: '🦟' }
    ]
  },
  {
    title: 'Sistem',
    items: [
      { href: '/admin/system-health', label: 'Sistem Sağlığı', icon: '🩺' },
      { href: '/admin/weekly-reports', label: 'Haftalık Raporlar', icon: '📊' },
      { href: '/admin/settings', label: 'Ayarlar & Özellikler', icon: '⚙️' },
      { href: '/admin/navigation', label: 'Navigasyon', icon: '🧭' }
    ]
  }
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto p-4 space-y-4">
      {navSections.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-[11px] font-black text-text-secondary uppercase tracking-widest mb-2">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-100 text-purple-900 shadow-xs border border-purple-200/80 font-extrabold'
                      : 'text-text-secondary hover:text-primary hover:bg-bg-main'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
