'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface LearnClientProps {
  articles: any[];
  userPets: any[];
  initialSavedIds: string[];
  initialPetId?: string;
}

export default function LearnClient({
  articles,
  userPets,
  initialSavedIds,
  initialPetId
}: LearnClientProps) {
  const [activeTab, setActiveTab] = useState<'personalized' | 'all' | 'saved'>('personalized');
  const [selectedPetId, setSelectedPetId] = useState<string>(
    initialPetId || userPets[0]?.id || ''
  );

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));

  // Filtreler (Tüm Bilgiler sekmesi)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterLifeStage, setFilterLifeStage] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');

  const selectedPet = useMemo(
    () => userPets.find((p) => p.id === selectedPetId) || userPets[0],
    [selectedPetId, userPets]
  );

  // Idempotent Save / Unsave
  const handleToggleSave = async (articleId: string) => {
    const isCurrentlySaved = savedIds.has(articleId);
    const nextAction = isCurrentlySaved ? 'unsave' : 'save';

    const nextSaved = new Set(savedIds);
    if (isCurrentlySaved) nextSaved.delete(articleId);
    else nextSaved.add(articleId);
    setSavedIds(nextSaved);

    try {
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

  // 1. Sekme: Petine Özel İçerikler
  const personalizedArticles = useMemo(() => {
    if (!selectedPet) return [];
    const petSpecies = (selectedPet.species || '').toLowerCase().trim();

    return articles.filter((art) => {
      // Tür filtresi
      if (art.species_filter && art.species_filter.length > 0) {
        const allowed = art.species_filter.map((s: string) => s.toLowerCase());
        if (!allowed.includes('both') && !allowed.includes(petSpecies)) {
          return false;
        }
      }
      return true;
    });
  }, [articles, selectedPet]);

  // 2. Sekme: Tüm Bilgiler Filtreleme
  const filteredAllArticles = useMemo(() => {
    return articles.filter((art) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = art.title?.toLowerCase().includes(q);
        const excerptMatch = art.excerpt?.toLowerCase().includes(q);
        if (!titleMatch && !excerptMatch) return false;
      }

      if (filterCategory && art.category !== filterCategory) return false;

      if (filterSpecies) {
        if (art.species_filter && art.species_filter.length > 0) {
          const allowed = art.species_filter.map((s: string) => s.toLowerCase());
          if (!allowed.includes('both') && !allowed.includes(filterSpecies)) {
            return false;
          }
        }
      }

      if (filterLifeStage) {
        if (!art.target_life_stages || !art.target_life_stages.includes(filterLifeStage)) {
          return false;
        }
      }

      if (filterSeason) {
        if (!art.target_seasons || !art.target_seasons.includes(filterSeason)) {
          return false;
        }
      }

      if (filterTargetType === 'pete_ozel') {
        const hasTargeting =
          (art.target_breed_keys && art.target_breed_keys.length > 0) ||
          (art.target_breed_traits && art.target_breed_traits.length > 0) ||
          (art.target_life_stages && art.target_life_stages.length > 0);
        if (!hasTargeting) return false;
      } else if (filterTargetType === 'genel') {
        const hasTargeting =
          (art.target_breed_keys && art.target_breed_keys.length > 0) ||
          (art.target_breed_traits && art.target_breed_traits.length > 0) ||
          (art.target_life_stages && art.target_life_stages.length > 0);
        if (hasTargeting) return false;
      }

      return true;
    });
  }, [articles, searchQuery, filterCategory, filterSpecies, filterLifeStage, filterSeason, filterTargetType]);

  // 3. Sekme: Kaydedilen İçerikler
  const savedArticlesList = useMemo(() => {
    return articles.filter((art) => savedIds.has(art.id));
  }, [articles, savedIds]);

  const renderCard = (art: any, reason?: string) => {
    const isSaved = savedIds.has(art.id);
    const reviewDate = art.content_reviewed_at
      ? new Date(art.content_reviewed_at).toLocaleDateString('tr-TR', {
          month: 'short',
          year: 'numeric'
        })
      : null;

    return (
      <div
        key={art.id}
        className="flex flex-col md:flex-row gap-4 p-4 rounded-card bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/40 transition-all duration-200"
      >
        {/* Kapak Görseli */}
        {art.cover_url && (
          <div className="w-full md:w-36 h-36 shrink-0 rounded-2xl overflow-hidden bg-gray-100">
            <img src={art.cover_url} alt={art.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-800 text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  {art.category || 'genel'}
                </span>
                {art.is_medical_content && (
                  <span className="text-[10px] font-800 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md uppercase">
                    Veteriner Onaylı
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)] font-600">
                {art.read_time_minutes || 3} dk okuma
              </span>
            </div>

            {reason && (
              <p className="text-[10px] text-[var(--color-text-secondary)] font-600 italic mb-1 truncate">
                {reason}
              </p>
            )}

            <h3 className="text-[15px] font-800 text-[var(--color-text-primary)] leading-snug line-clamp-1">
              {art.title}
            </h3>

            <p className="text-[11px] text-[var(--color-text-secondary)] font-500 line-clamp-2 mt-1 leading-relaxed">
              {art.excerpt}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-[var(--color-border)]/60">
            <span className="text-[10px] text-[var(--color-text-muted)] font-500">
              {reviewDate ? `Son kontrol: ${reviewDate}` : 'Güncel'}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleSave(art.id)}
                className={`text-[11px] font-700 flex items-center gap-1 transition-colors ${
                  isSaved ? 'text-amber-600 font-900' : 'text-[var(--color-text-secondary)] hover:text-amber-600'
                }`}
              >
                <i className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: '14px' }} />
                <span>{isSaved ? 'Kaydedildi' : 'Kaydet'}</span>
              </button>

              <Link
                href={`/owner/learn/${art.slug}?pet_id=${selectedPet?.id || ''}`}
                className="text-[11px] font-800 text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
              >
                Devamını Oku →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Üst Başlık & Açıklama */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)]">Bilgi ve Rehber</h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] font-500">
          Petinin sağlığı, bakımı ve mutlu yaşamı için güvenilir bilgiler.
        </p>
      </div>

      {/* Sekme Butonları */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personalized')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'personalized'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Petine Özel {userPets.length > 0 && `(${selectedPet?.name || ''})`}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tüm Bilgiler ({articles.length})
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'saved'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Kaydettiklerin ({savedIds.size})
        </button>
      </div>

      {/* SEKME 1: Petine Özel */}
      {activeTab === 'personalized' && (
        <div className="space-y-4">
          {/* Pet Seçici (Birden fazla pet varsa) */}
          {userPets.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Aktif Pet:</span>
              {userPets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    selectedPetId === pet.id
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-gray-50 text-gray-600 border hover:bg-gray-100'
                  }`}
                >
                  {pet.name} ({pet.species === 'cat' ? 'Kedi' : 'Köpek'})
                </button>
              ))}
            </div>
          )}

          {personalizedArticles.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 border border-dashed rounded-card space-y-2">
              <i className="ti ti-bookmark-off text-3xl text-gray-400" />
              <p className="text-xs font-semibold text-gray-600">
                {selectedPet?.name || 'Petiniz'} için henüz kişiselleştirilmiş içerik bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {personalizedArticles.map((art) =>
                renderCard(
                  art,
                  `${selectedPet?.name || 'Petiniz'}'nin ${
                    selectedPet?.species === 'cat' ? 'kedi' : 'köpek'
                  } profili ile eşleşti.`
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* SEKME 2: Tüm Bilgiler */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filtreleme Barı */}
          <div className="bg-white border border-[var(--color-border)] p-3.5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Başlık veya özet ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white"
            />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
            >
              <option value="">Tüm Kategoriler</option>
              <option value="genel">Genel Bakım</option>
              <option value="saglik">Sağlık & Medikal</option>
              <option value="beslenme">Beslenme</option>
              <option value="egitim">Eğitim & Davranış</option>
              <option value="bakim">Tüy & Hijyen</option>
            </select>

            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
            >
              <option value="">Tüm Türler</option>
              <option value="cat">Kedi</option>
              <option value="dog">Köpek</option>
            </select>

            <select
              value={filterTargetType}
              onChange={(e) => setFilterTargetType(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
            >
              <option value="">Tüm Hedefler</option>
              <option value="genel">Genel Rehberler</option>
              <option value="pete_ozel">Pete Özel Rehberler</option>
            </select>
          </div>

          {filteredAllArticles.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 border border-dashed rounded-card">
              <p className="text-xs font-semibold text-gray-600">Arama kriterlerinize uygun rehber bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAllArticles.map((art) => renderCard(art))}
            </div>
          )}
        </div>
      )}

      {/* SEKME 3: Kaydettiklerin */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedArticlesList.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 border border-dashed rounded-card space-y-2">
              <i className="ti ti-bookmark text-3xl text-gray-400" />
              <p className="text-xs font-semibold text-gray-600">Henüz kaydettiğiniz bir rehber bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedArticlesList.map((art) => renderCard(art))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
