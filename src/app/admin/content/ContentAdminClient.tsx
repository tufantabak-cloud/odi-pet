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

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // İnsan Kaynak Doğrulama State
  const [selectedSourceForVerify, setSelectedSourceForVerify] = useState<any | null>(null);
  const [chkTitleUrl, setChkTitleUrl] = useState(false);
  const [chkTopic, setChkTopic] = useState(false);

  // Revizyon Geçmişi State
  const [revisionsModalOpen, setRevisionsModalOpen] = useState(false);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_url: '',
    category: 'genel',
    read_time_minutes: 3,
    species_filter: [] as string[],
    target_breed_keys: [] as string[],
    target_breed_traits: [] as string[],
    target_life_stages: [] as string[],
    target_genders: [] as string[],
    target_neutered_status: 'all',
    target_seasons: [] as string[],
    start_date: '',
    end_date: '',
    priority_order: 0,
    is_medical_content: false,
    vet_review_status: 'not_required',
    references_list: '',
    is_published: false,
    freshness_type: 'evergreen',
    review_interval_days: 365,
    latest_change_summary: '',
    content_version: 1,
    is_archived: false
  });

  // Kontrol Kuyruğu Uyarısı State
  const [reviewQueueAlerts, setReviewQueueAlerts] = useState<string[]>([]);
  const [reviewQueueCounts, setReviewQueueCounts] = useState<any>(null);

  const fetchReviewQueue = async () => {
    try {
      const res = await fetch('/api/admin/content/review-queue');
      const json = await res.json();
      if (res.ok) {
        setReviewQueueCounts(json.counts);
        const alerts: string[] = [];
        if (json.counts?.expired > 0) {
          alerts.push(`${json.counts.expired} içeriğin kontrol süresi geçti`);
        }
        if (json.counts?.due30Days > 0) {
          alerts.push(`${json.counts.due30Days} içerik önümüzdeki 30 gün içinde kontrol edilmeli`);
        }
        if (json.counts?.missingSources > 0) {
          alerts.push(`${json.counts.missingSources} içerikte aktif kaynak bulunmuyor`);
        }
        if (json.counts?.pendingVetReview > 0) {
          alerts.push(`${json.counts.pendingVetReview} tıbbi içerik veteriner onayı bekliyor`);
        }
        setReviewQueueAlerts(alerts);
      }
    } catch {
      // sessizce geç
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/admin/content/jobs');
      const json = await res.json();
      if (res.ok) setJobs(json || []);
    } catch {
      setJobs([]);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      fetchReviewQueue();
      fetchJobs();
      const params = new URLSearchParams();
      if (filterQuery) params.set('q', filterQuery);
      if (filterCategory) params.set('category', filterCategory);
      if (filterSpecies) params.set('species', filterSpecies);
      if (filterStatus) params.set('status', filterStatus);
      if (filterMedical) params.set('is_medical', filterMedical);
      if (filterVetStatus) params.set('vet_status', filterVetStatus);
      if (filterFreshness) params.set('freshness', filterFreshness);

      const res = await fetch(`/api/admin/content?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'İçerikler yüklenemedi.');
      }
      setArticles(json.data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [filterQuery, filterCategory, filterSpecies, filterStatus, filterMedical, filterVetStatus, filterFreshness]);

  // Otomatik Slug Üretme
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
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      cover_url: '',
      category: 'genel',
      read_time_minutes: 3,
      species_filter: ['dog', 'cat'],
      target_breed_keys: [],
      target_breed_traits: [],
      target_life_stages: [],
      target_genders: [],
      target_neutered_status: 'all',
      target_seasons: [],
      start_date: '',
      end_date: '',
      priority_order: 0,
      is_medical_content: false,
      vet_review_status: 'not_required',
      references_list: '',
      is_published: false,
      freshness_type: 'evergreen',
      review_interval_days: 365,
      latest_change_summary: 'İlk sürüm oluşturuldu.',
      content_version: 1,
      is_archived: false
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (article: any) => {
    setEditingId(article.id);
    setFormData({
      title: article.title || '',
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      cover_url: article.cover_url || '',
      category: article.category || 'genel',
      read_time_minutes: article.read_time_minutes || 3,
      species_filter: article.species_filter || [],
      target_breed_keys: article.target_breed_keys || [],
      target_breed_traits: article.target_breed_traits || [],
      target_life_stages: article.target_life_stages || [],
      target_genders: article.target_genders || [],
      target_neutered_status: article.target_neutered_status || 'all',
      target_seasons: article.target_seasons || [],
      start_date: article.start_date || '',
      end_date: article.end_date || '',
      priority_order: article.priority_order || 0,
      is_medical_content: Boolean(article.is_medical_content),
      vet_review_status: article.vet_review_status || 'not_required',
      references_list: Array.isArray(article.references_list)
        ? article.references_list.join('\n')
        : '',
      is_published: Boolean(article.is_published),
      freshness_type: article.freshness_type || 'evergreen',
      review_interval_days: article.review_interval_days || 365,
      latest_change_summary: '',
      content_version: article.content_version || 1,
      is_archived: Boolean(article.archived_at)
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFetchRevisions = async (articleId: string) => {
    setRevisionsLoading(true);
    setRevisionsModalOpen(true);
    try {
      const res = await fetch(`/api/admin/content/${articleId}/revisions`);
      const json = await res.json();
      if (res.ok) {
        setRevisionsList(json || []);
      }
    } catch {
      setRevisionsList([]);
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleReverifyOnly = async (articleId: string) => {
    try {
      const res = await fetch(`/api/admin/content/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reverify' })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Yeniden doğrulama başarısız oldu.');
      }

      setSuccessMsg('İçerik güncelliği yeniden doğrulandı (Sürüm değiştirilmedi).');
      setTimeout(() => setSuccessMsg(''), 4000);
      setIsModalOpen(false);
      fetchArticles();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleTogglePublish = async (article: any) => {
    try {
      const nextPublishedState = !article.is_published;
      const res = await fetch(`/api/admin/content/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: nextPublishedState })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Yayın durumu değiştirilemedi.');
      }

      setSuccessMsg(
        nextPublishedState
          ? `"${article.title}" başarıyla yayınlandı.`
          : `"${article.title}" yayından kaldırıldı.`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchArticles();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        references_list: formData.references_list
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean)
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

      setSuccessMsg(editingId ? 'İçerik ve sürüm geçmişi güncellendi.' : 'Yeni içerik oluşturuldu.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setIsModalOpen(false);
      fetchArticles();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dinamik Irk Listesi
  const availableBreeds = ALL_BREEDS.filter((b) => {
    if (formData.species_filter.length === 0) return true;
    if (b.species === 'both') return true;
    return formData.species_filter.includes(b.species);
  });

  // İçerik Kapsamı (Coverage Gaps) Analizi
  const now = new Date();
  const activePublishedArticles = articles.filter(
    (a) => a.is_published && !a.archived_at && (!a.next_review_at || new Date(a.next_review_at) >= now)
  );

  const coverageGaps: string[] = [];

  // Kedi & Köpek genel bakım kontrolü
  const hasCatGen = activePublishedArticles.some((a) => a.species_filter?.includes('cat'));
  const hasDogGen = activePublishedArticles.some((a) => a.species_filter?.includes('dog'));
  if (!hasCatGen) coverageGaps.push('Kedilere yönelik güncel içerik yok.');
  if (!hasDogGen) coverageGaps.push('Köpeklere yönelik güncel içerik yok.');

  // Yaşam Evresi Kontrolleri
  const hasJuniorCat = activePublishedArticles.some((a) => a.species_filter?.includes('cat') && a.target_life_stages?.includes('junior'));
  const hasJuniorDog = activePublishedArticles.some((a) => a.species_filter?.includes('dog') && a.target_life_stages?.includes('junior'));
  if (!hasJuniorCat) coverageGaps.push('Yavru kediler için güncel bakım/beslenme içeriği eksik.');
  if (!hasJuniorDog) coverageGaps.push('Yavru köpekler için güncel eğitim/bakım içeriği eksik.');

  // Mevsimsel Kontroller
  const hasWinter = activePublishedArticles.some((a) => a.target_seasons?.includes('winter'));
  const hasSummer = activePublishedArticles.some((a) => a.target_seasons?.includes('summer'));
  if (!hasWinter) coverageGaps.push('Kış dönemi bakımı için güncel içerik yok.');
  if (!hasSummer) coverageGaps.push('Yaz dönemi bakımı ve sıcak havalar için güncel içerik yok.');

  // Irk Özellikleri Kontrolleri
  const hasBrachy = activePublishedArticles.some((a) => a.target_breed_traits?.includes('brachycephalic'));
  if (!hasBrachy) coverageGaps.push('Basık burunlu irklar (Pug, Siyam vb.) için güncel bakım içeriği yok.');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Üst Başlık & Ekle Butonu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]">İçerik Yaşam Döngüsü & Yönetimi</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            İçerik güncelliğini, sürüm geçmişini ve kapsama boşluklarını (Coverage Gaps) yönetin.
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

      {/* İçerik Kapsamı (Coverage Gaps) Paneli */}
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
          onClick={() => setActiveMainTab('articles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'articles'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          İçerik Kataloğu ({articles.length})
        </button>

        <button
          onClick={() => setActiveMainTab('jobs')}
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
                  jobs.map((j) => (
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
                        {j.content_generation_job_sources?.filter((s: any) => s.verification_status === 'verified').length || 0} / {j.content_generation_job_sources?.length || 0} Doğrulandı
                        <div className="mt-1 space-y-1">
                          {j.content_generation_job_sources?.map((src: any) => (
                            <div key={src.id} className="text-[11px] p-2 bg-gray-50 border rounded-md space-y-1">
                              <div className="font-semibold text-gray-800 line-clamp-1">{src.source_title}</div>
                              <div className="text-[10px] text-gray-500 flex items-center justify-between">
                                <span>{src.publisher} ({src.publication_date || 'Tarih Yok'})</span>
                                <a href={src.canonical_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Yeni Sekmede Aç</a>
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
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-red-600 max-w-xs truncate">{j.last_error || '-'}</td>
                      <td className="p-3 text-right space-x-2">
                        {['approved_for_import', 'admin_review_required', 'draft_ready'].includes(j.generation_status) && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/content/jobs/${j.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'import' })
                                });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json.error || 'Aktarım başarısız.');
                                setSuccessMsg('Taslak makaleye aktarıldı (Taslak olarak kaydedildi).');
                                fetchArticles();
                              } catch (err: any) {
                                setErrorMsg(err.message);
                              }
                            }}
                            className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-emerald-700"
                          >
                            Makaleye Aktar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
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
          {/* Arama */}
          <input
            type="text"
            placeholder="Arama yapın..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
          />

          {/* Kategori */}
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

          {/* Tür */}
          <select
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="">Tüm Türler</option>
            <option value="cat">Kedi</option>
            <option value="dog">Köpek</option>
          </select>

          {/* Yayın & Arşiv Durumu */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="">Tüm Yayın Durumları</option>
            <option value="published">Yayında</option>
            <option value="draft">Taslak</option>
            <option value="archived">Arşivlendi</option>
          </select>

          {/* Vet Onay Durumu */}
          <select
            value={filterVetStatus}
            onChange={(e) => setFilterVetStatus(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="">Tüm Vet Onayları</option>
            <option value="not_required">Gerekli Değil</option>
            <option value="pending">Onay Bekliyor</option>
            <option value="approved">Veteriner Onaylı</option>
          </select>

          {/* Güncellik Filtresi */}
          <select
            value={filterFreshness}
            onChange={(e) => setFilterFreshness(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-amber-50/50 border-amber-200 font-bold focus:bg-white focus:outline-none"
          >
            <option value="">Tüm Güncellik Durumları</option>
            <option value="fresh">Güncel İçerikler</option>
            <option value="due_soon">Kontrol Tarihi Yaklaşanlar (30 Gün)</option>
            <option value="expired">Kontrol Süresi Geçenler</option>
            <option value="needs_review">İnceleme Bekleyenler</option>
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
                  <th className="p-3.5">Güncellik Durumu</th>
                  <th className="p-3.5">Sonraki Kontrol</th>
                  <th className="p-3.5">Yayın / Arşiv</th>
                  <th className="p-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {articles.map((art) => {
                  const isExpired = art.next_review_at && new Date(art.next_review_at) < now;
                  const isDueSoon =
                    art.next_review_at &&
                    new Date(art.next_review_at) >= now &&
                    new Date(art.next_review_at) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={art.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 truncate">{art.title}</span>
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
                        <button
                          onClick={() => handleTogglePublish(art)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all ${
                            art.is_published
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {art.is_published ? 'Yayında ✓' : 'Taslak'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleFetchRevisions(art.id)}
                          className="text-gray-600 hover:text-gray-900 font-bold"
                          title="Sürüm Geçmişi"
                        >
                          Sürümler
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(art)}
                          className="text-indigo-600 hover:text-indigo-900 font-bold"
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

      {/* İçerik Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900">
                  {editingId ? 'İçerik & Sürüm Yönetimi' : 'Yeni İçerik Ekle'}
                </h2>
                {editingId && (
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
                    Mevcut Sürüm: v{formData.content_version}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Yeniden Doğrulama Hızlı Eylemi */}
            {editingId && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-emerald-950">Bilgi Hâlâ Güncel mi?</p>
                  <p className="text-[11px] text-emerald-800">
                    İçerik metninde değişiklik yapmadan sadece kontrol tarihini yenileyebilirsiniz (Sürüm artmaz).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReverifyOnly(editingId)}
                  className="px-3.5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors shrink-0"
                >
                  Gözden Geçir & Onayla ✓
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Temel Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Başlık *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dashboard Kısa Özeti *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tam İçerik (Markdown/Düz Metin) *</label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white font-mono text-[11px]"
                />
              </div>

              {/* Güncellik & Periyot Ayarları */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-extrabold text-sm text-gray-900">Güncellik & Kontrol Periyodu</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Güncellik Türü (freshness_type)</label>
                    <select
                      value={formData.freshness_type}
                      onChange={(e) => {
                        const ft = e.target.value;
                        const defaultInterval = ft === 'medical' || ft === 'seasonal' ? 180 : ft === 'product_regulatory' ? 90 : 365;
                        setFormData({ ...formData, freshness_type: ft, review_interval_days: defaultInterval });
                      }}
                      className="w-full p-2.5 border rounded-xl bg-gray-50"
                    >
                      <option value="evergreen">Evergreen (Her Zaman Güncel - 365 Gün)</option>
                      <option value="medical">Tıbbi / Medikal (180 Gün)</option>
                      <option value="seasonal">Mevsimsel (180 Gün)</option>
                      <option value="product_regulatory">Mevzuat / Ürün (90 Gün)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Kontrol Periyodu (Gün)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.review_interval_days}
                      onChange={(e) => setFormData({ ...formData, review_interval_days: Number(e.target.value) })}
                      className="w-full p-2.5 border rounded-xl bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Değişiklik Açıklaması (Sürüm Notu)</label>
                    <input
                      type="text"
                      value={formData.latest_change_summary}
                      onChange={(e) => setFormData({ ...formData, latest_change_summary: e.target.value })}
                      placeholder="İçerik düzenlendiğinde zorunludur..."
                      className="w-full p-2.5 border rounded-xl bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Tıbbi & Kaynakça Ayarları */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-extrabold text-sm text-gray-900">Tıbbi Onay & Bilimsel Kaynaklar</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-3.5 border border-amber-200/60 rounded-2xl">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_medical_content}
                        onChange={(e) => setFormData({ ...formData, is_medical_content: e.target.checked })}
                      />
                      Bu Bir Tıbbi / Sağlık İçeriğidir
                    </label>
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 mb-1">Veteriner Kontrol Durumu</label>
                    <select
                      value={formData.vet_review_status}
                      onChange={(e) => setFormData({ ...formData, vet_review_status: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-white"
                    >
                      <option value="not_required">Gerekli Değil</option>
                      <option value="pending">Onay Bekliyor (Pending)</option>
                      <option value="approved">Veteriner Onaylı (Approved)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Bilimsel / Tıbbi Kaynaklar (Her satıra bir kaynak)</label>
                  <textarea
                    rows={2}
                    value={formData.references_list}
                    onChange={(e) => setFormData({ ...formData, references_list: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 text-[11px]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 font-black text-sm text-gray-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      />
                      Canlıda Yayınla
                    </label>

                    <label className="flex items-center gap-2 font-bold text-xs text-rose-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_archived}
                        onChange={(e) => setFormData({ ...formData, is_archived: e.target.checked })}
                      />
                      Arşivle (Yayından Kaldır)
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-xl shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? 'Kaydediliyor...' : editingId ? 'Güncelle & Yeni Sürüm Oluştur' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sürüm Geçmişi (Revisions) Modalı */}
      {revisionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-black text-gray-900">Sürüm Geçmişi & Değişiklik Günlüğü</h2>
              <button
                onClick={() => setRevisionsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {revisionsLoading ? (
              <p className="text-xs text-gray-500 font-medium py-4 text-center">Yükleniyor...</p>
            ) : revisionsList.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium py-4 text-center">Henüz kaydedilmiş eski sürüm yok.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {revisionsList.map((rev) => (
                  <div key={rev.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>Sürüm v{rev.version_number}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(rev.changed_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-gray-700 italic text-[11px]">{rev.change_summary || 'Açıklama girilmedi'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* İNSAN KAYNAK DOĞRULAMA MODALI */}
      {selectedSourceForVerify && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">İnsan Kaynak İnceleme ve Doğrulama Bariyeri</h3>
            <div className="space-y-2 text-xs text-gray-700">
              <div><strong className="text-gray-900">Gerçek Başlık:</strong> {selectedSourceForVerify.source_title}</div>
              <div><strong className="text-gray-900">Canonical URL:</strong> <a href={selectedSourceForVerify.canonical_url} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono">{selectedSourceForVerify.canonical_url}</a></div>
              <div><strong className="text-gray-900">PMID / DOI:</strong> {selectedSourceForVerify.external_identifier || '-'}</div>
              <div><strong className="text-gray-900">Yayıncı / Dergi:</strong> {selectedSourceForVerify.publisher}</div>
              <div><strong className="text-gray-900">Yayın Tarihi:</strong> {selectedSourceForVerify.publication_date || '-'}</div>
              <div><strong className="text-gray-900">Teknik / Semantik Durum:</strong> {selectedSourceForVerify.technical_validation_status} / {selectedSourceForVerify.semantic_relevance}</div>
              <div className="p-2 bg-gray-50 border rounded text-[11px] font-mono text-gray-600"><strong className="text-gray-900">Abstract Özeti:</strong> {selectedSourceForVerify.source_excerpt || 'Özet mevcut değil'}</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="font-bold text-amber-950">İnsan Doğrulama Onayları (Zorunlu)</div>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input type="checkbox" checked={chkTitleUrl} onChange={(e) => setChkTitleUrl(e.target.checked)} className="rounded text-amber-600" />
                <span>Kaynağın gerçek başlığını ve adresini kontrol ettim.</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input type="checkbox" checked={chkTopic} onChange={(e) => setChkTopic(e.target.checked)} className="rounded text-amber-600" />
                <span>Kaynağın iş konusu ile ilgili olduğunu kontrol ettim.</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => { setSelectedSourceForVerify(null); setChkTitleUrl(false); setChkTopic(false); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200"
              >
                Vazgeç
              </button>
              <button
                disabled={!chkTitleUrl || !chkTopic}
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/admin/content/jobs/${selectedSourceForVerify.job_id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'verify_source',
                        source_id: selectedSourceForVerify.id,
                        verification_status: 'verified',
                        confirmed_title_url: true,
                        confirmed_relevance: true
                      })
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || 'Doğrulama başarısız.');
                    setSuccessMsg('Kaynak insan admin oturumu ile başarıyla doğrulandı.');
                    setSelectedSourceForVerify(null);
                    setChkTitleUrl(false);
                    setChkTopic(false);
                    fetchArticles();
                  } catch (err: any) {
                    setErrorMsg(err.message);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                Kaynağı İnsan Olarak Doğrula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
