'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import SmartCardBanner from './SmartCardBanner';
import type { SmartInsight } from '@/lib/insight-engine';

interface SmartInsightCardProps {
  insight: SmartInsight;
}

export default function SmartInsightCard({ insight }: SmartInsightCardProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // If dismissed in this session, do not show.
  // In a real app, we might also call an API to snooze the alert for X days.
  if (dismissed) return null;

  const handleClick = () => {
    router.push(insight.actionUrl);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-[0_0_20px_rgba(239,68,68,0.1)] rounded-[20px]">
      <SmartCardBanner
        title={insight.title}
        message={insight.message}
        ctaText={insight.ctaText}
        icon={insight.icon}
        gradient={insight.gradient}
        iconBg={insight.iconBg}
        onClick={handleClick}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
