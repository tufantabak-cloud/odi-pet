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
      className="relative flex items-center justify-between gap-3.5 p-4 rounded-2xl border border-[#e8e4f8] bg-white hover:border-[#534AB7]/30 transition-all cursor-pointer shadow-sm group active:scale-[0.99] select-none overflow-hidden"
      style={{ fontFamily: 'inherit' }}
    >
      {/* İkon */}
      <div className="w-[38px] h-[38px] rounded-[10px] bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
        <i className={`${task.icon} text-[18px]`} />
      </div>

      {/* Metin İçeriği */}
      <div className="flex-1 min-w-0 pr-4">
        <h4 className="text-[13px] font-bold text-[#26215C] leading-tight">
          {task.title}
        </h4>
        <p className="text-[10px] text-[#6F6B99] font-medium mt-0.5 leading-normal">
          {task.description}
        </p>
      </div>

      {/* Buton ve Kapatma Çaprazı */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleAction}
          className="py-1.5 px-3 rounded-lg bg-[#534AB7] hover:bg-[#443C9E] text-white text-[10px] font-extrabold transition-colors"
        >
          {task.actionText}
        </button>
        <button
          onClick={handleDismiss}
          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-100 text-[#C5C2E6] hover:text-red-500 transition-colors"
        >
          <i className="ti ti-x text-[12px]" />
        </button>
      </div>
    </div>
  );
}
