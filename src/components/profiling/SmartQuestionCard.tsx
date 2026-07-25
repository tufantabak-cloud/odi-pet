'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import SmartCardBanner from './SmartCardBanner';
import type { SmartQuestion } from '@/lib/profiling-engine';

interface SmartQuestionCardProps {
  question: SmartQuestion;
}

export default function SmartQuestionCard({ question }: SmartQuestionCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleClick = async () => {
    if (question.type === 'weight') {
      router.push(`/owner/pets/${question.petId}/nutrition?tab=kilo`);
      await fetch('/api/profiling/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, action: 'clicked' })
      });
    } else if (question.type === 'breed') {
      router.push(`/owner/pets/${question.petId}/edit#breed-input`);
      await fetch('/api/profiling/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, action: 'clicked' })
      });
    } else if (question.type === 'daily_review') {
      // For phase 1, we can just redirect to the journal or an inline modal.
      router.push(`/owner/pets/${question.petId}/journal`);
      await fetch('/api/profiling/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, action: 'clicked' })
      });
    }
  };

  const handleDismiss = async () => {
    setDismissed(true);
    await fetch('/api/profiling/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: question.id, action: 'skipped' })
    });
  };

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <SmartCardBanner
        title={question.title}
        message={question.message}
        ctaText={loading ? 'Yükleniyor...' : question.ctaText}
        icon={question.icon}
        gradient={question.gradient}
        iconBg={question.iconBg}
        onClick={handleClick}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
