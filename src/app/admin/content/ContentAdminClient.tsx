'use client';

import { useState, useEffect } from 'react';

// Irk seçenekleri kaynağı
const ALL_BREEDS = [
  { key: 'poodle', name: 'Poodle / Kaniş', species: 'dog' },
  { key: 'golden_retriever', name: 'Golden Retriever', species: 'dog' },
  { key: 'labrador_retriever', name: 'Labrador Retriever', species: 'dog' },
  { key: 'german_shepherd', name: 'Alman Kurdu', species: 'dog' },
  { key: 'french_bulldog', name: 'Fransız Buldoğu', species: 'dog' },
  { key: 'pug', name: 'Pug', species: 'dog' },
  { key: 'rottweiler', name: 'Rottweiler', species: 'dog' },
  { key: 'shih_tzu', name: 'Shih Tzu', species: 'dog' },
  { key: 'chihuahua', name: 'Chihuahua', species: 'dog' },
  { key: 'yorkshire_terrier', name: 'Yorkshire Terrier', species: 'dog' },
  { key: 'british_shorthair', name: 'British Shorthair', species: 'cat' },
  { key: 'scottish_fold', name: 'Scottish Fold', species: 'cat' },
  { key: 'siamese', name: 'Siyam', species: 'cat' },
  { key: 'persian', name: 'İran Kedisi (Persian)', species: 'cat' },
  { key: 'maine_coon', name: 'Maine Coon', species: 'cat' },
  { key: 'mixed', name: 'Melez / Tekir / Bilinmeyen', species: 'both' }
];

export function resolveSourceUrl(src: any): string | null {
  if (!src) return null;
  const candidate =
    src.canonical_url ||
    src.final_url ||
    src.original_grounding_url ||
    src.source_url ||
    src.url;

  if (candidate && typeof candidate === 'string' && candidate.startsWith('http')) {
    return candidate;
  }
  return null;
}

export default function ContentAdminClient() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtreler
  const [filterQuery, setFilterQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMedical, setFilterMedical] = useState('');
  const [filterVetStatus, setFilterVetStatus] = useState('');
  const [filterFreshness, setFilterFreshness] = useState('');

  // Ana Sekme State
  const [activeMainTab, setActiveMainTab] = useState<'articles' | 'jobs'>('articles');
  const [jobs, setJobs] = useState<any[]>([]);

  // Form State & Validation Error
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');

  // İnsan Kaynak Doğrulama State
  const [selectedSourceForVerify, setSelectedSourceForVerify] = useState<any | null>(null);
  const [chkTitleUrl, setChkTitleUrl] = useState(false);
  const [chkTopic, setChkTopic] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'genel',
    species_filter: ['cat', 'dog'] as string[],
    target_breed_keys: [] as string[],
    target_breed_traits: [] as string[],
    target_life_stages: [] as string[],
    target_seasons: [] as string[],
    is_medical_content: false,
    freshness_type: 'evergreen',
    review_interval_days: 365,
    references_list: '',
    vet_review_status: 'not_required',
    is_published: false,
    latest_change_summary: 'İçerik taslağı kaydedildi.'
  });

  const fetchArticles = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const queryParams = new URLSearchParams();
      if (filterQuery) queryParams.set('q', filterQuery);
      if (filterCategory) queryParams.set('category', filterCategory);
      if (filterSpecies) queryParams.set('species', filterSpecies);
      if (filterStatus) queryParams.set('status', filterStatus);
      if (filterMedical) queryParams.set('is_medical', filterMedical);
      if (filterVetStatus) queryParams.set('vet_status', filterVetStatus);
      if (filterFreshness) queryParams.set('freshness', filterFreshness);

      const [artRes, jobsRes] = await Promise.all([
        fetch(`/api/admin/content?${queryParams.toString()}`),
        fetch('/api/admin/content/jobs')
      ]);

      const artJson = await artRes.json();
      const jobsJson = await jobsRes.json();

      if (!artRes.ok) throw new Error(artJson.error || 'Makaleler alınamadı.');
      if (!jobsRes.ok) throw new Error(jobsJson.error || 'İş kuyruğu alınamadı.');

      const fetchedArticles = artJson.articles || artJson.data || (Array.isArray(artJson) ? artJson : []);
      const fetchedJobs = jobsJson.jobs || jobsJson.data || (Array.isArray(jobsJson) ? jobsJson : []);

      setArticles(fetchedArticles);
      setJobs(fetchedJobs);

      // Sayfa yüklenme sonrası URL parametrelerini değerlendir
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const articleIdParam = urlParams.get('articleId');

        if (tabParam === 'jobs' || tabParam === 'queue') {
          setActiveMainTab('jobs');
        } else {
          setActiveMainTab('articles');
        }

        if (articleIdParam) {
          const target = fetchedArticles.find((a: any) => a.id === articleIdParam);
          if (target) {
            handleOpenArticle(articleIdParam, fetchedArticles);
          } else {
            setErrorMsg('Makale bulunamadı.');
            setTimeout(() => setErrorMsg(''), 4000);
          }
        }
      }
    } catch (err: any) {
      console.error('[Admin Content Fetch Error]:', err);
      setErrorMsg(`İçerikler veya AI kuyruğu yüklenemedi: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [filterQuery, filterCategory, filterSpecies, filterStatus, filterMedical, filterVetStatus, filterFreshness]);

  // Makaleyi Aç (article_id ile tam uyumlu)
  const handleOpenArticle = (articleId: string | null | undefined, list = articles) => {
    if (!articleId) {
      setErrorMsg('Makale bağlantısı bulunamadı.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setActiveMainTab('articles');
    setEditingId(articleId);
    setFieldErrors({});
    setModalSuccessMsg('');
    setModalErrorMsg('');

    if (typeof window !== 'undefined') {
      const newUrl = `${window.location.pathname}?tab=catalog&articleId=${articleId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }

    const target = list.find((a) => a.id === articleId);
    if (target) {
      setFormData({
        title: target.title || '',
        slug: target.slug || '',
        excerpt: target.excerpt || '',
        content: target.content || '',
        category: target.category || 'genel',
        species_filter: target.species_filter || ['cat', 'dog'],
        target_breed_keys: target.target_breed_keys || [],
        target_breed_traits: target.target_breed_traits || [],
        target_life_stages: target.target_life_stages || [],
        target_seasons: target.target_seasons || [],
        is_medical_content: Boolean(target.is_medical_content),
        freshness_type: target.freshness_type || 'evergreen',
        review_interval_days: target.review_interval_days || 365,
        references_list: Array.isArray(target.references_list) ? target.references_list.join('\n') : '',
        vet_review_status: target.vet_review_status || 'not_required',
        is_published: Boolean(target.is_published),
        latest_change_summary: 'İçerik taslağı güncellendi.'
      });
      setIsModalOpen(true);
    } else {
      setErrorMsg('Makale bulunamadı.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleTitleChange = (val: string) => {
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: editingId ? prev.slug : autoSlug
    }));
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFieldErrors({});
    setModalSuccessMsg('');
    setModalErrorMsg('');
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: 'genel',
      species_filter: ['cat', 'dog'],
      target_breed_keys: [],
      target_breed_traits: [],
      target_life_stages: [],
      target_seasons: [],
      is_medical_content: false,
      freshness_type: 'evergreen',
      review_interval_days: 365,
      references_list: '',
      vet_review_status: 'not_required',
      is_published: false,
      latest_change_summary: 'Yeni içerik taslağı oluşturuldu.'
    });
    setIsModalOpen(true);
  };

  const handleEditArticle = (art: any) => {
    handleOpenArticle(art.id);
  };

  // Form Doğrulaması (3. Madde)
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = 'Başlık alanı zorunludur.';
    if (!formData.slug?.trim()) errors.slug = 'Slug alanı zorunludur.';
    if (!formData.excerpt?.trim()) errors.excerpt = 'Kısa özet zorunludur.';
    if (!formData.content?.trim()) errors.content = 'İçerik metni zorunludur.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 2. Aksiyon: Taslağı Kaydet
  const handleSaveDraft = async () => {
    if (!validateForm()) {
      setModalErrorMsg('Lütfen zorunlu alanları doldurun.');
      return;
    }

    setIsSubmitting(true);
    setModalErrorMsg('');
    setModalSuccessMsg('');

    try {
      const payload = {
        ...formData,
        references_list: formData.references_list
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean),
        latest_change_summary: formData.latest_change_summary || 'İçerik taslağı kaydedildi.'
      };

      const url = editingId ? `/api/admin/content/${editingId}` : '/api/admin/content';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'İşlem başarısız oldu.');
      }

      setModalSuccessMsg('İçerik taslağı kaydedildi.');
      setSuccessMsg('İçerik taslağı kaydedildi.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchArticles();
    } catch (err: any) {
      setModalErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Aksiyon: Veteriner İncelemesine Gönder
  const handleSendToVetReview = async () => {
    if (!editingId) {
      setModalErrorMsg('İncelemeye göndermeden önce içeriği kaydedin.');
      return;
    }

    setIsSubmitting(true);
    setModalErrorMsg('');
    setModalSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/content/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vet_review_status: 'pending',
          latest_change_summary: 'Veteriner incelemesine gönderildi.'
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'İncelemeye gönderme başarısız.');

      setFormData((prev) => ({ ...prev, vet_review_status: 'pending' }));
      setModalSuccessMsg('İçerik veteriner incelemesine gönderildi.');
      setSuccessMsg('İçerik veteriner incelemesine gönderildi.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchArticles();
    } catch (err: any) {
      setModalErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Aksiyon: Yayınla
  const handlePublishArticle = async () => {
    if (!editingId) return;

    setIsSubmitting(true);
    setModalErrorMsg('');
    setModalSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/content/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_published: true,
          latest_change_summary: 'İçerik yayınlandı.'
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Yayınlama başarısız.');
      }

      setFormData((prev) => ({ ...prev, is_published: true }));
      setModalSuccessMsg('İçerik başarıyla yayınlandı.');
      setSuccessMsg('İçerik başarıyla yayınlandı.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchArticles();
    } catch (err: any) {
      setModalErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePublishedArticles = articles.filter((a) => a.is_published && !a.archived_at);
  const coverageGaps: string[] = [];

  const catArticles = activePublishedArticles.filter((a) => a.species_filter?.includes('cat'));
  const dogArticles = activePublishedArticles.filter((a) => a.species_filter?.includes('dog'));

  if (catArticles.length === 0) coverageGaps.push('Kedi türü için yayınlanmış aktif içerik bulunmuyor.');
  if (dogArticles.length === 0) coverageGaps.push('Köpek türü için yayınlanmış aktif içerik bulunmuyor.');

  const reviewQueueAlerts: string[] = [];
  const now = new Date();

  articles.forEach((art) => {
    if (art.next_review_at && new Date(art.next_review_at) < now) {
      reviewQueueAlerts.push(`"${art.title}" başlığının periyodik kontrol süresi doldu.`);
    }
    if (art.is_medical_content && art.vet_review_status === 'pending') {
      reviewQueueAlerts.push(`"${art.title}" medikal içerik veteriner onayı bekliyor.`);
    }
  });

  return (
    <div className="space-y-6">
      {/* Üst Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-main)] flex items-center gap-2">
            <span>📚</span> İçerik Yönetimi & Yaşam Döngüsü
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Evcil hayvanlar için doğrulanan kaynaklara dayalı kişiselleştirilmiş rehber kataloğu ve AI taslak kuyruğu.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm self-start md:self-auto"
        >
          + Yeni İçerik Ekle
        </button>
      </div>

      {/* Kontrol Kuyruğu Uyarı Banner'ı */}
      {reviewQueueAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <i className="ti ti-alert-triangle text-amber-600 text-base" />
            <span>Kontrol Kuyruğu & Güncellik Uyarıları</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {reviewQueueAlerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/80 border border-amber-200 p-2.5 rounded-xl font-semibold text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İçerik Kapsamı Paneli */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold flex items-center gap-2">
            <i className="ti ti-chart-dots" />
            İçerik Kapsamı & Eksiklik Analizi (Coverage Gaps)
          </h2>
          <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
            {activePublishedArticles.length} Aktif & Güncel İçerik
          </span>
        </div>

        {coverageGaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {coverageGaps.map((gap, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl">
                <i className="ti ti-alert-circle text-amber-300 shrink-0" />
                <span className="text-purple-100 font-medium">{gap}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-emerald-300 font-semibold">
            Tüm temel kategorilerde ve yaş evrelerinde güncel içerik kapsama seviyesi tam.
          </p>
        )}
      </div>

      {/* Ana Sekmeler */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
        <button
          onClick={() => {
            setActiveMainTab('articles');
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/admin/content?tab=catalog');
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'articles'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          İçerik Kataloğu ({articles.length})
        </button>

        <button
          onClick={() => {
            setActiveMainTab('jobs');
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/admin/content?tab=jobs');
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeMainTab === 'jobs'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span>AI Taslak Kuyruğu</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
            {jobs.length}
          </span>
        </button>
      </div>

      {/* SEKME 2: AI Taslak Kuyruğu */}
      {activeMainTab === 'jobs' && (
        <div className="space-y-4">
          <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b font-bold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Konu</th>
                  <th className="p-3">Tür</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Kaynaklar</th>
                  <th className="p-3">Hata</th>
                  <th className="p-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                      Kuyrukta bekleyen AI içerik işi bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => {
                    const verifiedSourcesCount = j.content_generation_job_sources?.filter((s: any) => s.verification_status === 'verified').length || 0;
                    const totalSourcesCount = j.content_generation_job_sources?.length || 0;

                    return (
                      <tr key={j.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-900">{j.topic}</td>
                        <td className="p-3 text-gray-600 uppercase font-bold text-[10px]">
                          {j.job_type === 'new_content' ? 'Yeni İçerik' : 'Güncelleme'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-100 text-purple-900 border border-purple-200">
                            {j.generation_status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          <div className="font-bold text-[11px] mb-1">
                            {verifiedSourcesCount} / {totalSourcesCount} Doğrulandı
                          </div>
                          <div className="space-y-1">
                            {j.content_generation_job_sources?.map((src: any) => {
                              const validUrl = resolveSourceUrl(src);

                              return (
                                <div key={src.id} className="text-[11px] p-2 bg-gray-50 border rounded-md space-y-1">
                                  <div className="font-semibold text-gray-800 line-clamp-1">{src.source_title}</div>
                                  <div className="text-[10px] text-gray-500 flex items-center justify-between gap-2">
                                    <span>{src.publisher || 'Kaynak'} ({src.publication_date || 'Tarih Yok'})</span>
                                    {validUrl ? (
                                      <a
                                        href={validUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-600 font-bold hover:underline shrink-0"
                                      >
                                        Yeni Sekmede Aç ↗
                                      </a>
                                    ) : (
                                      <span className="text-gray-400 italic text-[10px] shrink-0">Kaynak bağlantısı bulunamadı</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${src.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800' : src.verification_status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {src.verification_status}
                                    </span>
                                    {src.verification_status === 'proposed' && (
                                      <button
                                        onClick={() => setSelectedSourceForVerify(src)}
                                        className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700"
                                      >
                                        İnsan İle İncele & Doğrula
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-red-600 max-w-xs truncate">
                          {j.generation_status === 'imported' || j.article_id ? '-' : (j.last_error || '-')}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {j.article_id ? (
                            <button
                              onClick={() => handleOpenArticle(j.article_id)}
                              className="bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-1 rounded-lg font-extrabold text-[11px] hover:bg-purple-200 transition-all shadow-xs"
                            >
                              Makaleyi Aç ↗
                            </button>
                          ) : ['approved_for_import', 'admin_review_required', 'draft_ready'].includes(j.generation_status) ? (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/content/jobs/${j.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'import_generated_draft_to_article' })
                                  });
                                  const json = await res.json();
                                  if (!res.ok) throw new Error(json.error || 'Aktarım başarısız.');
                                  setSuccessMsg(json.message || 'Makale taslağı oluşturuldu.');
                                  setTimeout(() => setSuccessMsg(''), 4000);
                                  fetchArticles();
                                } catch (err: any) {
                                  setErrorMsg(err.message);
                                }
                              }}
                              className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-all"
                            >
                              Makaleye Aktar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* SEKME 1: İçerik Kataloğu */}
      {activeMainTab === 'articles' && (
        <div className="space-y-6">
          {/* Filtre Barı */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              <input
                type="text"
                placeholder="Arama yapın..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
              />

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
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
                className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="">Tüm Türler</option>
                <option value="cat">Kedi</option>
                <option value="dog">Köpek</option>
                <option value="both">Ortak</option>
              </select>

              <select
                value={filterVetStatus}
                onChange={(e) => setFilterVetStatus(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="">Veteriner Durumu</option>
                <option value="not_required">Gerekmiyor</option>
                <option value="pending">Onay Bekliyor</option>
                <option value="approved">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
              </select>

              <select
                value={filterFreshness}
                onChange={(e) => setFilterFreshness(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="">Güncellik Tipi</option>
                <option value="evergreen">Evergreen</option>
                <option value="seasonal">Mevsimsel</option>
                <option value="medical">Tıbbi</option>
                <option value="product_regulatory">Ürün & Mevzuat</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="">Yayın Durumu</option>
                <option value="published">Yayında</option>
                <option value="draft">Taslak</option>
              </select>
            </div>
          </div>

          {/* Liste Tablosu */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs text-gray-500 font-medium">Yükleniyor...</div>
            ) : articles.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500 font-medium">
                Henüz içerik bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Başlık / Sürüm</th>
                      <th className="p-3.5">Kategori / Tür</th>
                      <th className="p-3.5">Güncellik</th>
                      <th className="p-3.5">Sonraki Kontrol</th>
                      <th className="p-3.5">Yayın Durumu</th>
                      <th className="p-3.5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {articles.map((art) => {
                      const isExpired = art.next_review_at && new Date(art.next_review_at) < now;
                      const isDueSoon =
                        art.next_review_at &&
                        new Date(art.next_review_at).getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000;

                      return (
                        <tr key={art.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
                              <span>{art.title}</span>
                              <span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                                v{art.content_version || 1}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 truncate font-mono">/{art.slug}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="inline-block bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {art.category || 'genel'}
                            </span>
                            <div className="text-[10px] text-gray-500 mt-1">
                              {art.species_filter?.join(', ') || 'Tür seçilmemiş'}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {art.archived_at ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700">
                                Arşivlendi
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Süresi Geçti (Geçersiz)
                              </span>
                            ) : isDueSoon ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Kontrol Yaklaşıyor
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Güncel ✓
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-[11px] text-gray-600">
                            {art.next_review_at
                              ? new Date(art.next_review_at).toLocaleDateString('tr-TR')
                              : 'Belirtilmedi'}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${art.is_published ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                              {art.is_published ? 'Yayında ✓' : 'Taslak'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleEditArticle(art)}
                              className="text-[var(--color-primary)] font-bold text-[11px] hover:underline"
                            >
                              Düzenle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Makale Ekle / Düzenle Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-gray-900">
                {editingId ? 'İçerik Düzenle & Revize Et' : 'Yeni İçerik Ekle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* 4. Durum Bilgisi Banner'ı */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span>Durum Bilgisi:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${formData.is_published ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'}`}>
                  {formData.is_published ? 'Yayında ✓' : 'Taslak'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>İçerik Türü: <strong>{formData.is_medical_content ? 'Tıbbi / Medikal' : 'Genel'}</strong></div>
                <div>Veteriner Durumu: <strong>{formData.vet_review_status === 'approved' ? 'Onaylandı ✓' : formData.vet_review_status === 'pending' ? 'Onay Bekliyor' : 'Gerekmiyor'}</strong></div>
              </div>
            </div>

            {modalSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                {modalSuccessMsg}
              </div>
            )}
            {modalErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {modalErrorMsg}
              </div>
            )}

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Başlık *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                />
                {fieldErrors.title && <p className="text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.title}</p>}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full p-2.5 border rounded-xl font-mono text-[11px] bg-gray-50"
                />
                {fieldErrors.slug && <p className="text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.slug}</p>}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Kısa Özet (Excerpt) *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.excerpt}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, excerpt: e.target.value }));
                    if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, excerpt: '' }));
                  }}
                  className="w-full p-2.5 border rounded-xl"
                />
                {fieldErrors.excerpt && <p className="text-red-600 text-[10px] mt-1 font-bold">{fieldErrors.excerpt}</p>}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">İçerik Metni (Markdown) *</label>
                <textarea
                  rows={6}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full p-2.5 border rounded-xl font-mono text-[11px]"
                />
                {fieldErrors.content && <p className="text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.content}</p>}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Revizyon / Değişiklik Özeti Notu</label>
                <input
                  type="text"
                  value={formData.latest_change_summary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, latest_change_summary: e.target.value }))}
                  placeholder="İçerikte ne değiştirildi?"
                  className="w-full p-2.5 border rounded-xl bg-purple-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="genel">Genel Bakım</option>
                    <option value="saglik">Sağlık & Medikal</option>
                    <option value="beslenme">Beslenme</option>
                    <option value="egitim">Eğitim & Davranış</option>
                    <option value="bakim">Tüy & Hijyen</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Güncellik Tipi</label>
                  <select
                    value={formData.freshness_type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, freshness_type: e.target.value }))}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="evergreen">Evergreen (Genel)</option>
                    <option value="seasonal">Mevsimsel</option>
                    <option value="medical">Tıbbi</option>
                    <option value="product_regulatory">Ürün & Mevzuat</option>
                  </select>
                </div>
              </div>

              {/* 9. UI Buton Düzeni */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 w-full sm:w-auto"
                >
                  İptal
                </button>

                <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                  {/* Taslağı Kaydet */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveDraft}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-xs"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Taslağı Kaydet'}
                  </button>

                  {/* Veteriner İncelemesine Gönder */}
                  {formData.is_medical_content && (
                    <button
                      type="button"
                      disabled={isSubmitting || !editingId || formData.vet_review_status === 'pending'}
                      onClick={handleSendToVetReview}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                        formData.vet_review_status === 'pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      }`}
                    >
                      {formData.vet_review_status === 'pending' ? 'Veteriner İncelemesinde' : 'Veteriner İncelemesine Gönder'}
                    </button>
                  )}

                  {/* Yayınla */}
                  {(() => {
                    const isMedicalBlocked = formData.is_medical_content && formData.vet_review_status !== 'approved';
                    const isPublishDisabled = isSubmitting || isMedicalBlocked || formData.is_published;

                    return (
                      <div className="relative group">
                        <button
                          type="button"
                          disabled={isPublishDisabled}
                          onClick={handlePublishArticle}
                          className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                            formData.is_published
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isMedicalBlocked
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {formData.is_published ? 'Yayında ✓' : 'Yayınla'}
                        </button>

                        {/* Pasif Açıklama Tooltip */}
                        {isMedicalBlocked && !formData.is_published && (
                          <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-50 font-semibold leading-tight">
                            Bu tıbbi içerik veteriner onayından sonra yayınlanabilir.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
