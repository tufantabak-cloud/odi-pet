'use client';

import React, { useEffect, useState } from 'react';

interface WizardStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isActive: boolean;
}

export function WizardStep({ title, description, children, isActive }: WizardStepProps) {
  const [shouldRender, setShouldRender] = useState(isActive);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
      // Slight delay to trigger CSS transition
      const timer = requestAnimationFrame(() => {
        setAnimate(true);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setAnimate(false);
      // Wait for exit animation before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // 300ms matches duration-300
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (!shouldRender) return null;

  return (
    <div
      className={`w-full px-4 pt-6 transition-all duration-300 ease-out transform
        ${animate 
          ? 'translate-x-0 opacity-100 pointer-events-auto' 
          : 'translate-x-8 opacity-0 pointer-events-none'
        }
      `}
    >
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
      {description && (
        <p className="text-slate-500 mt-2 text-[15px] leading-relaxed">
          {description}
        </p>
      )}
      
      <div className="mt-8">
        {children}
      </div>
    </div>
  );
}
