'use client';

import { useState, useMemo, useEffect } from 'react';
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
  const [selectedPetId, setSelectedPetId] = useState<string>(
    initialPetId || userPets[0]?.id || ''
  );

  const selectedPet = useMemo(
    () => userPets.find((p) => p.id === selectedPetId) || userPets[0],
    [selectedPetId, userPets]
  );

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));

  // 1. Sekme: Petine Özel İçerikler
  const personalizedArticles = useMemo(() => {
    if (!selectedPet) return [];
    const petSpecies = (selectedPet.species || '').toLowerCase().trim();

    return articles.filter((art) => {
      if (art.species_filter && art.species_filter.length > 0) {
        const allowed = art.species_filter.map((s: string) => s.toLowerCase());
        if (!allowed.includes('both') && !allowed.includes(petSpecies)) {
          return false;
        }
      }
      return true;
    });
  }, [articles, selectedPet]);

  // Varsayılan Sekme Mantığı: Petine özel varsa 'personalized', yoksa genel içerik varsa 'all'
  const initialDefaultTab = useMemo(() => {
    if (personalizedArticles.length > 0) return 'personalized';
    if (articles.length > 0) return 'all';
    return 'personalized';
  }, [personalizedArticles.length, articles.length]);

  const [activeTab, setActiveTab] = useState<'personalized' | 'all' | 'saved'>(initialDefaultTab);

  // Sekme senkronizasyonu
  useEffect(() => {
    if (activeTab === 'personalized' && personalizedArticles.length === 0 && articles.length > 0) {
      setActiveTab('all');
    }
  }, []);

  // Filtreler (Tüm Bilgiler sekmesi)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterLifeStage, setFilterLifeStage] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');

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

  // 2. Sekme: Tüm Bilgiler (Filtrelenmiş)
  const filteredAllArticles = useMemo(() => {
    return articles.filter((art) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = art.title?.toLowerCase().includes(q);
        const excerptMatch = art.excerpt?.toLowerCase().includes(q);
        if (!titleMatch && !excerptMatch) return false;
      }

      if (filterCategory && art.category !== filterCategory) {
        return false;
      }

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
        className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-3"
      >
        {/* Üst Bilgiler & Rozetler */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px]">
              {art.category || 'Rehber'}
            </span>
            {art.is_medical_content && (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                Medikal Onaylı ✓
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 font-medium">
              ⏱ {art.read_time_minutes || 3} dk okuma
            </span>
            <button
              onClick={() => handleToggleSave(art.id)}
              className={`p-1.5 rounded-xl transition-all ${
                isSaved
                  ? 'bg-purple-100 text-purple-700 font-bold'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={isSaved ? 'Kaydedilenlerden Çıkar' : 'Kaydet'}
            >
              <i className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
            </button>
          </div>
        </div>

        {/* Eşleşme Gerekçesi (Pete Özel sekmesinde) */}
        {reason && (
          <div className="bg-purple-50/70 border border-purple-100 text-purple-900 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <i className="ti ti-sparkles text-purple-600 text-sm" />
            <span>{reason}</span>
          </div>
        )}

        {/* Başlık ve Özet */}
        <div>
          <Link
            href={`/owner/learn/${art.slug}`}
            className="text-base font-extrabold text-gray-900 hover:text-[var(--color-primary)] transition-colors line-clamp-2"
          >
            {art.title}
          </Link>
          <p className="text-xs text-gray-600 mt-1.5 line-clamp-3 leading-relaxed">
            {art.excerpt || art.content?.slice(0, 140) + '...'}
          </p>
        </div>

        {/* Alt Bilgi Barı */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            {reviewDate && <span>Son Kontrol: {reviewDate}</span>}
            {art.references_list && art.references_list.length > 0 && (
              <span className="text-purple-700 font-semibold">
                {art.references_list.length} Kanıt Kaynağı
              </span>
            )}
          </div>

          <Link
            href={`/owner/learn/${art.slug}`}
            className="text-[var(--color-primary)] font-extrabold hover:underline flex items-center gap-1"
          >
            Detaylı Oku <i className="ti ti-arrow-right" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Üst Başlık */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Bilgi ve Rehber Kütüphanesi</h1>
        <p className="text-xs text-gray-500 mt-1">
          Can dostunuzun sağlığı, bakımı ve gelişimi için bilimsel araştırmalara dayalı onaylı rehberler.
        </p>
      </div>

      {/* Sekme Butonları */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personalized')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'personalized'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span>✨ Petine Özel</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
            {personalizedArticles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span>📚 Tüm Bilgiler</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
            {articles.length}
          </span>
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
            <div className="p-10 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-3">
              <i className="ti ti-sparkles text-3xl text-purple-400" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-800">
                  Petiniz için henüz kişiselleştirilmiş bir rehber bulunmuyor.
                </p>
                {articles.length > 0 && (
                  <p className="text-[11px] text-gray-500">
                    Tüm Bilgiler bölümünde {articles.length} rehber bulunuyor.
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveTab('all')}
                className="mt-2 inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-all shadow-xs"
              >
                <span>Tüm Bilgileri Gör</span>
                <i className="ti ti-arrow-right" />
              </button>
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
            <div className="p-12 text-center bg-gray-50 border border-dashed rounded-2xl">
              <p className="text-xs font-semibold text-gray-600">Henüz yayınlanmış bir rehber bulunmuyor.</p>
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
            <div className="p-12 text-center bg-gray-50 border border-dashed rounded-2xl space-y-2">
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
