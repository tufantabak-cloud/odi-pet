'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PetMicroTask } from '@/lib/microTasks/petMicroTasks';
import {
  ShieldCheck,
  Bug,
  Scale,
  Utensils,
  Calendar,
  Heart,
  Phone,
  Scissors,
  Sparkles,
  PawPrint,
  X,
} from 'lucide-react';

interface PetMicroTaskCardProps {
  task: PetMicroTask;
  petId: string;
  onDismiss: (id: string) => void;
  onDirectAction?: (directAction: string) => void;
}

export function PetMicroTaskCard({
  task,
  petId,
  onDismiss,
  onDirectAction,
}: PetMicroTaskCardProps) {
  const router = useRouter();

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.directAction && onDirectAction) {
      onDirectAction(task.directAction);
    } else {
      router.push(task.route);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(task.id);
  };

  const renderTaskIcon = () => {
    const iconClass = "w-5 h-5 stroke-[2]";
    if (task.type.includes('vaccine')) return <ShieldCheck className={iconClass} />;
    if (task.type.includes('parasite')) return <Bug className={iconClass} />;
    if (task.type.includes('weight') || task.type.includes('amount')) return <Scale className={iconClass} />;
    if (task.type.includes('nutrition') || task.type.includes('meals')) return <Utensils className={iconClass} />;
    if (task.type.includes('birth')) return <Calendar className={iconClass} />;
    if (task.type.includes('gender') || task.type.includes('neutered')) return <Heart className={iconClass} />;
    if (task.type.includes('emergency')) return <Phone className={iconClass} />;
    if (task.type.includes('grooming')) return <Scissors className={iconClass} />;
    if (task.type.includes('dental')) return <Sparkles className={iconClass} />;
    return <PawPrint className={iconClass} />;
  };

  const getTaskStyle = () => {
    if (task.type.includes('vaccine') || task.type.includes('emergency')) {
      return {
        accentColor: 'var(--color-primary, #5D3EBD)',
        bg: 'rgba(93,63,211,0.03)',
        iconBg: 'rgba(93,63,211,0.10)',
        iconColor: 'var(--color-primary, #5D3EBD)',
        btnBg: 'var(--color-primary, #5D3EBD)',
        tagColor: 'var(--color-primary, #5D3EBD)',
        tagText: 'Tıbbi · Sağlık',
      };
    }
    if (task.type.includes('parasite')) {
      return {
        accentColor: '#0F8F84',
        bg: 'rgba(78,205,196,0.03)',
        iconBg: 'rgba(78,205,196,0.10)',
        iconColor: '#0F8F84',
        btnBg: '#0F8F84',
        tagColor: '#0F8F84',
        tagText: 'Rutin Sağlık',
      };
    }
    if (task.type.includes('weight') || task.type.includes('food') || task.type.includes('meals') || task.type.includes('nutrition')) {
      return {
        accentColor: '#D97706',
        bg: 'rgba(245,158,11,0.03)',
        iconBg: 'rgba(245,158,11,0.10)',
        iconColor: '#D97706',
        btnBg: '#D97706',
        tagColor: '#D97706',
        tagText: 'Beslenme · Takip',
      };
    }
    return {
      accentColor: 'var(--color-primary, #5D3EBD)',
      bg: 'rgba(93,63,211,0.03)',
      iconBg: 'rgba(93,63,211,0.10)',
      iconColor: 'var(--color-primary, #5D3EBD)',
      btnBg: 'var(--color-primary, #5D3EBD)',
      tagColor: 'var(--color-primary, #5D3EBD)',
      tagText: 'Profil · Eksik',
    };
  };

  const style = getTaskStyle();

  return (
    <div
      onClick={handleAction}
      className="relative flex items-center justify-between gap-3 p-4 rounded-[24px] border border-slate-100 bg-white hover:border-slate-200 transition-all duration-200 cursor-pointer shadow-xs group active:scale-[0.99] select-none overflow-hidden"
      style={{ background: style.bg }}
    >
      {/* Sol Vurgu Çubuğu (Inset accent bar - rounded corners ile tam uyumlu) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[24px]"
        style={{ backgroundColor: style.accentColor }}
      />

      {/* İkon Kapsayıcı */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ml-1 group-hover:scale-105 transition-transform duration-200"
        style={{ background: style.iconBg, color: style.iconColor }}
      >
        {renderTaskIcon()}
      </div>

      {/* Metin İçeriği */}
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-2xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: style.tagColor }}>
          {style.tagText}
        </p>
        <h4 className="text-sm font-semibold text-text-primary leading-snug truncate">
          {task.title}
        </h4>
        <p className="text-xs font-normal text-text-secondary leading-normal line-clamp-2 mt-0.5">
          {task.description}
        </p>
      </div>

      {/* Aksiyon Alanı (Yatay Hizalı) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleAction}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-[0.97] shadow-xs"
          style={{ backgroundColor: style.btnBg }}
        >
          {task.actionText}
        </button>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

