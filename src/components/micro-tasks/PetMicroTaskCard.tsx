'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PetMicroTask } from '@/lib/microTasks/petMicroTasks';

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

  return (
    <div
      onClick={handleAction}
      className="relative flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/30 transition-all cursor-pointer shadow-sm group active:scale-[0.99] select-none overflow-hidden"
    >
      {/* Sol Vurgu Çubuğu */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[var(--color-primary)]" />

      {/* İkon */}
      <div className="w-[38px] h-[38px] rounded-xl bg-[var(--color-primary-soft,rgba(93,63,211,0.08))] text-[var(--color-primary)] flex items-center justify-center flex-shrink-0 ml-1.5 group-hover:scale-105 transition-transform duration-200">
        <i className={`${task.icon} text-[18px]`} />
      </div>

      {/* Metin İçeriği */}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-[12.5px] font-bold text-[var(--color-text-primary)] leading-tight truncate">
          {task.title}
        </h4>
        <p className="text-[10.5px] text-[var(--color-text-muted)] font-medium mt-0.5 leading-snug line-clamp-2">
          {task.description}
        </p>
      </div>

      {/* Buton ve Kapatma Çaprazı */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleAction}
          className="px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[11px] font-extrabold transition-colors active:scale-[0.97]"
        >
          {task.actionText}
        </button>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
          title="Kapat"
        >
          <i className="ti ti-x text-[12px]" />
        </button>
      </div>
    </div>
  );
}
