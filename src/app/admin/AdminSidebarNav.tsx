'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  PawPrint,
  Award,
  BookOpen,
  Sparkles,
  Syringe,
  Bug,
  Stethoscope,
  BarChart3,
  Settings,
  Compass,
  Wand2,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Genel Bakış',
    items: [{ href: '/admin', label: 'Panel', icon: Home }]
  },
  {
    title: 'Yönetim',
    items: [
      { href: '/admin/users', label: 'Kullanıcılar', icon: Users },
      { href: '/admin/pets', label: 'Evcil Hayvanlar', icon: PawPrint },
      { href: '/admin/memberships', label: 'Üyelik & Abonelikler', icon: Award }
    ]
  },
  {
    title: 'Platform Servisleri',
    items: [
      { href: '/admin/content', label: 'İçerik Yönetimi', icon: BookOpen },
      { href: '/admin/orchestrator', label: 'Deneyim Orkestratörü', icon: Wand2 },
      { href: '/admin/ai-vet', label: 'AI-Vet Analiz', icon: Sparkles },
      { href: '/admin/vaccines', label: 'Aşı Protokolleri', icon: Syringe },
      { href: '/admin/parasite-products', label: 'Parazit Ürünleri', icon: Bug }
    ]
  },
  {
    title: 'Sistem',
    items: [
      { href: '/admin/system-health', label: 'Sistem Sağlığı', icon: Stethoscope },
      { href: '/admin/weekly-reports', label: 'Haftalık Raporlar', icon: BarChart3 },
      { href: '/admin/settings', label: 'Ayarlar & Özellikler', icon: Settings },
      { href: '/admin/navigation', label: 'Navigasyon', icon: Compass }
    ]
  }
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto p-4 space-y-4">
      {navSections.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] ${
                    isActive
                      ? 'bg-purple-100 text-purple-900 shadow-xs border border-purple-200/80 font-bold'
                      : 'text-text-secondary hover:text-primary hover:bg-bg-main'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
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
