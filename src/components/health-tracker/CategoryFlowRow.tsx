'use client';
import React from 'react';
import { FlowBucket, FlowEvent } from './types';
import { CategoryCard } from './CategoryCard';
import { CategoryKey } from '@/lib/categoryThemes';

interface CategoryFlowRowProps {
  flow: FlowBucket;
  categoryKey: CategoryKey;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: FlowEvent) => void;
  onDelete: (id: string) => void;
}

/** Ortak "Bugün" ekseniyle hizalı 3 kolonlu akış satırı: geçmiş | bugün | gelecek */
export function CategoryFlowRow({ flow, categoryKey, onMarkDone, onPostpone, onEdit, onDelete }: CategoryFlowRowProps) {
  const { before, anchor, after } = flow;
  if (before.length === 0 && !anchor && after.length === 0) return null;

  const cardProps = { categoryKey, onMarkDone, onPostpone, onEdit, onDelete };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_116px_minmax(0,1fr)] items-center">
      <div className="flex justify-end items-center gap-3 overflow-x-auto scrollbar-none py-2 pr-3">
        {before.map(event => (
          <CategoryCard key={event.id} event={event} {...cardProps} />
        ))}
      </div>

      <div className="flex justify-center">
        {anchor ? (
          <CategoryCard event={anchor} {...cardProps} />
        ) : (
          <div className="w-[100px] h-[100px] shrink-0" />
        )}
      </div>

      <div className="flex justify-start items-center gap-3 overflow-x-auto scrollbar-none py-2 pl-3">
        {after.map(event => (
          <CategoryCard key={event.id} event={event} {...cardProps} />
        ))}
      </div>
    </div>
  );
}
