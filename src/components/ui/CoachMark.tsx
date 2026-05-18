'use client';

import { useState, useEffect, RefObject } from 'react';

export type CoachMarkPosition = 'top' | 'bottom' | 'left' | 'right';

export interface CoachMarkProps {
  hintKey: string;
  title: string;
  message: string;
  icon: string;
  position: CoachMarkPosition;
  targetRef?: RefObject<HTMLElement>;
  delay?: number;
  condition?: boolean;
}

export default function CoachMark({
  hintKey,
  title,
  message,
  icon,
  position,
  targetRef,
  delay = 1500,
  condition = true,
}: CoachMarkProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!condition) return;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/hints');
        if (res.ok) {
          const data = await res.json();
          if (data.dismissed?.includes(hintKey)) {
            setIsDismissed(true);
          } else {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
          }
        }
      } catch (err) {
        console.error('Failed to fetch hints', err);
      }
    };

    checkStatus();
  }, [hintKey, delay, condition]);

  const handleDismiss = async () => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      await fetch('/api/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint_key: hintKey }),
      });
    } catch (err) {
      console.error('Failed to dismiss hint', err);
    }
  };

  if (!isMounted) return null;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  if (isDismissed) {
    return (
      <div className="relative inline-block z-10">
        <button
          onClick={() => setIsTooltipOpen(!isTooltipOpen)}
          className="text-gray-400 hover:text-accent-orange transition-colors flex items-center justify-center p-1 rounded-full bg-white/50 backdrop-blur-sm shadow-sm"
          aria-label="İpucu"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </button>
        {isTooltipOpen && (
          <div className={`absolute w-48 p-3 bg-white border border-gray-100 rounded-xl shadow-lg z-50 animate-fade-in text-sm text-gray-600 ${positionClasses[position]}`}>
            <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
              <span>{icon}</span> {title}
            </div>
            {message}
          </div>
        )}
      </div>
    );
  }

  if (!isVisible) return null;

  return (
    <div className={`absolute z-50 w-[300px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in translate-y-0 ${positionClasses[position]}`}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent-orange" />
      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h4 className="font-bold text-gray-900">{title}</h4>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end">
          <button
            onClick={handleDismiss}
            className="text-xs font-semibold text-accent-orange hover:text-orange-600 transition-colors py-1 px-3 rounded-full hover:bg-orange-50"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
