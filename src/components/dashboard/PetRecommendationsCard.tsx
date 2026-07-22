'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface PetRecommendationsCardProps {
  activePet: {
    id: string;
    name: string;
  };
}

/**
 * Tekil Öneri Kart Bileşeni
 * IntersectionObserver ile en az %50 görünürlük ve 800ms kesintisiz dwell-time takip eder.
 */
function RecommendationCardItem({
  rec,
  badgeLabel,
  activePetId,
  isSaved,
  onToggleSave,
  onDismiss,
  trackedShownRef
}: {
  rec: any;
  badgeLabel: string;
  activePetId: string;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onDismiss: (id: string) => void;
  trackedShownRef: React.MutableRefObject<Set<string>>;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !rec?.article?.id || !activePetId) return;

    const trackKey = `${activePetId}:${rec.article.id}`;
    if (trackedShownRef.current.has(trackKey)) return;

    // Window / SSR kontrolü ve IntersectionObserver varlık denetimi
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // En az %50 görünürlük sağlandı
            if (!trackedShownRef.current.has(trackKey) && !timerRef.current) {
              timerRef.current = setTimeout(() => {
                if (!trackedShownRef.current.has(trackKey)) {
                  trackedShownRef.current.add(trackKey);
                  fetch(`/api/pets/${activePetId}/articles/${rec.article.id}/interaction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'shown' })
                  }).catch(() => {});
                }
              }, 800);
            }
          } else {
            // Görünürlük %50'nin altına düştü -> Zamanlayıcıyı sıfırla
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      observer.disconnect();
    };
  }, [rec?.article?.id, activePetId, trackedShownRef]);

  if (!rec || !rec.article) return null;
  const art = rec.article;

  return (
    <div
      ref={cardRef}
      key={art.id}
      className="flex flex-col md:flex-row gap-3.5 p-4 rounded-card bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/30 transition-all duration-200"
    >
      {/* Kapak Görseli (Varsa) */}
      {art.cover_url && (
        <div className="w-full md:w-28 h-28 md:h-full shrink-0 rounded-xl overflow-hidden bg-gray-100">
          <img src={art.cover_url} alt={art.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
        <div>
          {/* Rozet & Okuma Süresi */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-800 text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-md uppercase tracking-wider">
              {badgeLabel}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-600">
              {art.read_time_minutes || 3} dk okuma
            </span>
          </div>

          <p className="text-[10px] text-[var(--color-text-secondary)] font-600 italic mb-1.5 truncate">
            {rec.reason}
          </p>

          <h3 className="text-[14px] font-800 text-[var(--color-text-primary)] leading-snug line-clamp-1">
            {art.title}
          </h3>

          <p className="text-[11px] text-[var(--color-text-secondary)] font-500 line-clamp-2 mt-1 leading-relaxed">
            {art.excerpt}
          </p>
        </div>

        {/* Eylemler: Devamını Oku | Kaydet | İlgilenmiyorum */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/50">
          <Link
            href={`/owner/learn/${art.slug}?pet_id=${activePetId}`}
            className="text-[11px] font-800 text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            Devamını Oku →
          </Link>

          <div className="flex items-center gap-3">
            {/* Kaydet */}
            <button
              onClick={() => onToggleSave(art.id)}
              className={`text-[11px] font-700 flex items-center gap-1 transition-colors ${
                isSaved ? 'text-amber-600 font-900' : 'text-[var(--color-text-secondary)] hover:text-amber-600'
              }`}
              title={isSaved ? 'Kaydı Kaldır' : 'Kaydet'}
            >
              <i className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: '14px' }} />
              <span>{isSaved ? 'Kaydedildi' : 'Kaydet'}</span>
            </button>

            {/* İlgilenmiyorum */}
            <button
              onClick={() => onDismiss(art.id)}
              className="text-[11px] font-700 text-[var(--color-text-muted)] hover:text-rose-600 flex items-center gap-1 transition-colors"
              title="İlgilenmiyorum"
            >
              <i className="ti ti-eye-off" style={{ fontSize: '14px' }} />
              <span>İlgilenmiyorum</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PetRecommendationsCard({ activePet }: PetRecommendationsCardProps) {
  const [data, setData] = useState<{
    generalRecommendation: any | null;
    personalizedRecommendation: any | null;
    savedArticleIds: string[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Render edilen kartların shown etkileşiminin oturum tekilliği takibi için ref
  const trackedShownRef = useRef<Set<string>>(new Set());

  const fetchRecommendations = async (petId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pets/${petId}/content-recommendations`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
      setSavedIds(new Set(json.savedArticleIds || []));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activePet?.id) {
      trackedShownRef.current.clear(); // Aktif pet değiştiğinde tekilleştirme ref'ini sıfırla
      fetchRecommendations(activePet.id);
    }
  }, [activePet?.id]);

  // Idempotent Save / Unsave
  const handleToggleSave = async (articleId: string) => {
    try {
      const isCurrentlySaved = savedIds.has(articleId);
      const nextAction = isCurrentlySaved ? 'unsave' : 'save';

      // UI İyimser Güncelleme
      const nextSaved = new Set(savedIds);
      if (isCurrentlySaved) nextSaved.delete(articleId);
      else nextSaved.add(articleId);
      setSavedIds(nextSaved);

      const res = await fetch(`/api/articles/${articleId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction })
      });
      const json = await res.json();

      if (!res.ok) {
        setSavedIds(savedIds);
      } else {
        const finalSaved = new Set(savedIds);
        if (json.saved) finalSaved.add(articleId);
        else finalSaved.delete(articleId);
        setSavedIds(finalSaved);
      }
    } catch {
      setSavedIds(savedIds);
    }
  };

  const handleDismiss = async (articleId: string) => {
    try {
      await fetch(`/api/pets/${activePet.id}/articles/${articleId}/dismiss`, { method: 'POST' });
      fetchRecommendations(activePet.id);
    } catch {
      // Hata yönetimi
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2 pt-2">
        <div className="h-4 w-40 bg-gray-200/60 rounded-md animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-card animate-pulse" />
      </div>
    );
  }

  if (!data || (!data.generalRecommendation && !data.personalizedRecommendation)) {
    return null; // Hiç uygun öneri yoksa bölümü tamamen gizle
  }

  const { generalRecommendation, personalizedRecommendation } = data;

  return (
    <div className="flex flex-col gap-2.5 pt-2" id="section-recommendations">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-800 text-[var(--color-text-muted)] uppercase tracking-[1.2px]">
          {activePet.name} İçin Öneriler
        </h2>
        <Link
          href={`/owner/learn?petId=${activePet.id}`}
          className="text-[11px] font-800 text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
        >
          Tümünü gör →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {/* 1. Genel Bilgi */}
        {generalRecommendation && (
          <RecommendationCardItem
            rec={generalRecommendation}
            badgeLabel="Genel Bilgi"
            activePetId={activePet.id}
            isSaved={savedIds.has(generalRecommendation.article?.id)}
            onToggleSave={handleToggleSave}
            onDismiss={handleDismiss}
            trackedShownRef={trackedShownRef}
          />
        )}

        {/* 2. Pete Özel Bilgi */}
        {personalizedRecommendation && (
          <RecommendationCardItem
            rec={personalizedRecommendation}
            badgeLabel={`${activePet.name}'ya Özel`}
            activePetId={activePet.id}
            isSaved={savedIds.has(personalizedRecommendation.article?.id)}
            onToggleSave={handleToggleSave}
            onDismiss={handleDismiss}
            trackedShownRef={trackedShownRef}
          />
        )}
      </div>
    </div>
  );
}
