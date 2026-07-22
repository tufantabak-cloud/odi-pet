'use client';

import { useEffect, useRef } from 'react';

interface ArticleViewTrackerProps {
  petId: string;
  articleId: string;
}

export default function ArticleViewTracker({ petId, articleId }: ArticleViewTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!petId || !articleId || trackedRef.current) return;
    trackedRef.current = true;

    fetch(`/api/pets/${petId}/articles/${articleId}/interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'viewed' })
    }).catch(() => {
      // Sessiz hata yönetimi
    });
  }, [petId, articleId]);

  return null;
}
