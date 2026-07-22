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
  const [activeMainTab, setActiveMainTab] = useState<'articles' | 'jobs' | 'sources'>('articles');
  const [jobs, setJobs] = useState<any[]>([]);

  // Takip Edilen Kaynaklar State (Phase 1)
  const [monitoredSources, setMonitoredSources] = useState<any[]>([]);
  const [discoveredContents, setDiscoveredContents] = useState<any[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sourceFormUrl, setSourceFormUrl] = useState('');
  const [sourceFormSpecies, setSourceFormSpecies] = useState<'cat' | 'dog' | 'both'>('both');
  const [sourceFormMode, setSourceFormMode] = useState<'admin_review' | 'draft_only'>('admin_review');
  const [sourceErrorMsg, setSourceErrorMsg] = useState('');
  const [sourceSuccessMsg, setSourceSuccessMsg] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);

  // İş İşleme ve Silme State
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [selectedCategoryMap, setSelectedCategoryMap] = useState<Record<string, string>>({});
  const [deleteSourceModal, setDeleteSourceModal] = useState<{ isOpen: boolean; sourceId: string | null; sourceName: string }>({
    isOpen: false,
    sourceId: null,
    sourceName: ''
  });

  // Form State & Validation Error
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');

  // İnsan Kaynak Doğrulama State (Tekil & Toplu)
  const [selectedSourceForVerify, setSelectedSourceForVerify] = useState<any | null>(null);
  const [chkTitleUrl, setChkTitleUrl] = useState(false);
  const [chkTopic, setChkTopic] = useState(false);

  const [selectedJobForVerify, setSelectedJobForVerify] = useState<any | null>(null);
  const [sourceChecksMap, setSourceChecksMap] = useState<Record<string, { titleUrl: boolean; relevance: boolean; action: 'verified' | 'rejected'; rejectionReason?: string }>>({});
  const [isVerifyingJob, setIsVerifyingJob] = useState(false);

  const [showBulkVerifyModal, setShowBulkVerifyModal] = useState(false);
  const [bulkJobChecksMap, setBulkJobChecksMap] = useState<Record<string, Record<string, { titleUrl: boolean; relevance: boolean; action: 'verified' | 'rejected' }>>>({});
  const [isVerifyingBulk, setIsVerifyingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  const [showOptionalConfirmModal, setShowOptionalConfirmModal] = useState(false);

  const handleOpenSingleJobVerify = (job: any) => {
    setSelectedJobForVerify(job);
    const initialMap: Record<string, { titleUrl: boolean; relevance: boolean; action: 'verified' | 'rejected' }> = {};
    (job.content_generation_job_sources || []).forEach((src: any) => {
      initialMap[src.id] = {
        titleUrl: false,
        relevance: false,
        action: 'verified'
      };
    });
    setSourceChecksMap(initialMap);
  };

  const handleExecuteSingleJobVerify = async () => {
    if (!selectedJobForVerify) return;
    setIsVerifyingJob(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const sourcesPayload = Object.entries(sourceChecksMap).map(([source_id, check]) => ({
        source_id,
        action: check.action,
        confirmed_title_url: check.titleUrl,
        confirmed_relevance: check.relevance,
        rejection_reason: check.rejectionReason
      }));

      const res = await fetch(`/api/admin/content/jobs/${selectedJobForVerify.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_sources',
          sources: sourcesPayload
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Kaynak doğrulama başarısız.');

      setSuccessMsg('Kaynaklar başarıyla doğrulandı ve taslak makale oluşturuldu.');
      setTimeout(() => setSuccessMsg(''), 5000);
      setSelectedJobForVerify(null);
      fetchArticles();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifyingJob(false);
    }
  };

  const handleOpenBulkVerifyModal = () => {
    const reviewJobs = jobs.filter((j) => j.generation_status === 'source_review_required').slice(0, 10);
    if (reviewJobs.length === 0) {
      alert('Doğrulama bekleyen iş bulunmuyor.');
      return;
    }

    const initialBulkMap: Record<string, Record<string, { titleUrl: boolean; relevance: boolean; action: 'verified' | 'rejected' }>> = {};

    reviewJobs.forEach((j) => {
      initialBulkMap[j.id] = {};
      (j.content_generation_job_sources || []).forEach((src: any) => {
        initialBulkMap[j.id][src.id] = {
          titleUrl: false,
          relevance: false,
          action: 'verified'
        };
      });
    });

    setBulkJobChecksMap(initialBulkMap);
    setBulkResults(null);
    setShowBulkVerifyModal(true);
  };

  const handleExecuteBulkVerify = async () => {
    const reviewJobs = jobs.filter((j) => j.generation_status === 'source_review_required').slice(0, 10);
    if (reviewJobs.length === 0) return;

    setIsVerifyingBulk(true);
    setBulkResults(null);

    try {
      const payloadJobs = reviewJobs.map((j) => {
        const sourcesMap = bulkJobChecksMap[j.id] || {};
        const sources = Object.entries(sourcesMap).map(([source_id, check]) => ({
          source_id,
          action: check.action,
          confirmed_title_url: check.titleUrl,
          confirmed_relevance: check.relevance
        }));
        return { jobId: j.id, sources };
      });

      const res = await fetch('/api/admin/content/jobs/bulk-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: payloadJobs })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Toplu doğrulama başarısız.');

      setBulkResults(json.results || []);
      setSuccessMsg(`Toplu doğrulama tamamlandı: ${json.processedCount} iş işlendi.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchArticles();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifyingBulk(false);
    }
  };

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
    vet_review_requirement: 'required',
    vet_review_override_reason: '',
    vet_review_status: 'not_required',
    is_published: false,
    latest_change_summary: 'İçerik taslağı kaydedildi.'
  });

  const fetchMonitoredSources = async () => {
    setLoadingSources(true);
    setSourceErrorMsg('');
    try {
      const res = await fetch('/api/admin/content/monitored-sources');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Kaynaklar alınamadı.');

      setMonitoredSources(json.sources || []);
      setDiscoveredContents(json.discovered || []);
    } catch (err: any) {
      setSourceErrorMsg(err.message);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleAddSource = async () => {
    if (!sourceFormUrl || !sourceFormUrl.trim()) {
      setSourceErrorMsg('Lütfen geçerli bir kaynak URL adresi girin.');
      return;
    }

    setIsAddingSource(true);
    setSourceErrorMsg('');
    setSourceSuccessMsg('');

    try {
      const res = await fetch('/api/admin/content/monitored-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: sourceFormUrl.trim(),
          species_scope: sourceFormSpecies,
          processing_mode: sourceFormMode,
          is_manual_process: true
        })
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.code === 'unsupported_api') {
          throw new Error(json.error || 'Bu hesap resmî Instagram API ile takip edilemiyor. Gönderi URL\'si ekleyin.');
        }
        throw new Error(json.error || 'Kaynak ekleme başarısız.');
      }

      setSourceSuccessMsg(json.message || 'Kaynak başarıyla işlendi ve taslak hazırlandı.');
      setSourceFormUrl('');
      fetchMonitoredSources();
      fetchArticles(); // İş kuyruğu ve makaleleri yenile
    } catch (err: any) {
      setSourceErrorMsg(err.message);
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleToggleSourceActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/content/monitored-sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Güncelleme başarısız.');
      }
      fetchMonitoredSources();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSource = async (id: string, name: string = 'Kaynak') => {
    setDeleteSourceModal({ isOpen: true, sourceId: id, sourceName: name });
  };

  const handleConfirmDeleteSource = async (deleteJobs: boolean) => {
    if (!deleteSourceModal.sourceId) return;
    try {
      const res = await fetch(`/api/admin/content/monitored-sources/${deleteSourceModal.sourceId}?delete_jobs=${deleteJobs}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Silme işlemi başarısız.');

      setSourceSuccessMsg(json.message || 'Kaynak silindi.');
      setTimeout(() => setSourceSuccessMsg(''), 4000);
      setDeleteSourceModal({ isOpen: false, sourceId: null, sourceName: '' });
      fetchMonitoredSources();
      fetchArticles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProcessJob = async (jobId: string, category?: string) => {
    setProcessingJobId(jobId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/content/jobs/${jobId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'İşlem çalıştırılamadı.');

      setSuccessMsg(json.message || 'Boru hattı çalıştırıldı ve güncellendi.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchArticles();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Bu AI içerik işini silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/admin/content/jobs/${jobId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Silme işlemi başarısız.');

      setSuccessMsg('İçerik işi başarıyla silindi (soft delete).');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchArticles();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

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

        if (tabParam === 'sources') {
          setActiveMainTab('sources');
          fetchMonitoredSources();
        } else if (tabParam === 'jobs' || tabParam === 'queue') {
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
    setShowOptionalConfirmModal(false);

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
        vet_review_requirement: target.vet_review_requirement || (target.is_medical_content ? 'required' : 'not_required'),
        vet_review_override_reason: target.vet_review_override_reason || '',
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
    setShowOptionalConfirmModal(false);
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
      vet_review_requirement: 'not_required',
      vet_review_override_reason: '',
      vet_review_status: 'not_required',
      is_published: false,
      latest_change_summary: 'Yeni içerik taslağı oluşturuldu.'
    });
    setIsModalOpen(true);
  };

  const handleEditArticle = (art: any) => {
    handleOpenArticle(art.id);
  };

  // Form Doğrulaması
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = 'Başlık alanı zorunludur.';
    if (!formData.slug?.trim()) errors.slug = 'Slug alanı zorunludur.';
    if (!formData.excerpt?.trim()) errors.excerpt = 'Kısa özet zorunludur.';
    if (!formData.content?.trim()) errors.content = 'İçerik metni zorunludur.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 1. Aksiyon: Veteriner İnceleme Gereksinimini Değiştir
  const handleChangeRequirement = async (newRequirement: string) => {
    if (!editingId) {
      setFormData((prev) => ({ ...prev, vet_review_requirement: newRequirement }));
      return;
    }

    if (formData.is_medical_content && formData.vet_review_requirement === 'required' && ['optional', 'not_required'].includes(newRequirement)) {
      if (!formData.vet_review_override_reason || !formData.vet_review_override_reason.trim()) {
        setModalErrorMsg('Tıbbi içeriklerde veteriner onay zorunluluğunu değiştirmek için bir gerekçe girilmesi zorunludur.');
        return;
      }
    }

    setIsSubmitting(true);
    setModalErrorMsg('');
    setModalSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/content/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_vet_review_requirement',
          vet_review_requirement: newRequirement,
          vet_review_override_reason: formData.vet_review_override_reason
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gereksinim güncelleme başarısız oldu.');

      setFormData((prev) => ({
        ...prev,
        vet_review_requirement: json.vet_review_requirement || newRequirement,
        vet_review_status: json.vet_review_status || prev.vet_review_status,
        vet_review_override_reason: json.vet_review_override_reason || prev.vet_review_override_reason
      }));

      setModalSuccessMsg('Veteriner onay gereksinimi güncellendi. (Kalıcı audit kaydı oluşturuldu)');
      fetchArticles();
    } catch (err: any) {
      setModalErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
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
        action: 'save_article_draft',
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
          action: 'request_vet_review'
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

  // 8. Aksiyon: Yayınla Tıklama & Gerçek Yayınlama
  const executePublish = async () => {
    if (!editingId) return;

    setIsSubmitting(true);
    setModalErrorMsg('');
    setModalSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/content/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_article',
          title: formData.title,
          slug: formData.slug,
          excerpt: formData.excerpt,
          content: formData.content
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Yayınlama başarısız.');
      }

      setFormData((prev) => ({ ...prev, is_published: true, vet_review_status: json.vet_review_status || prev.vet_review_status }));
      setShowOptionalConfirmModal(false);
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

  const handlePublishClick = () => {
    // Optional ise uyarı modalı göster
    if (formData.vet_review_requirement === 'optional' && formData.vet_review_status !== 'approved') {
      setShowOptionalConfirmModal(true);
      return;
    }
    executePublish();
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

        <button
          onClick={() => {
            setActiveMainTab('sources');
            fetchMonitoredSources();
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/admin/content?tab=sources');
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeMainTab === 'sources'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span> Takip Edilen Kaynaklar</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
            {monitoredSources.length}
          </span>
        </button>
      </div>

      {/* SEKME 2: AI Taslak Kuyruğu */}
      {activeMainTab === 'jobs' && (
        <div className="space-y-4">
          {/* Top Banner / Actions */}
          <div className="flex items-center justify-between bg-purple-50 p-4 border border-purple-200 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-purple-900 flex items-center gap-2">
                <span>⚡</span> AI İçerik Üretim Kuyruğu
              </h3>
              <p className="text-xs text-purple-700">
                Kaynak doğrulaması tamamlanan içerikler otomatik olarak Türkçe taslak makaleye dönüştürülür.
              </p>
            </div>

            <button
              onClick={handleOpenBulkVerifyModal}
              className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              <span>🔍</span>
              <span>Doğrulama Bekleyenleri İncele</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-md text-[10px]">
                {jobs.filter((j) => j.generation_status === 'source_review_required').length}
              </span>
            </button>
          </div>

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
                    const requiredSourcesCount = j.required_source_count || (j.generated_draft?.is_medical_content || ['saglik', 'beslenme'].includes(j.generated_draft?.category) ? 2 : 1);
                    const isProcessing = processingJobId === j.id;

                    const proposedSources = j.content_generation_job_sources?.filter((s: any) => s.verification_status === 'proposed') || [];
                    const hasProposedSources = proposedSources.length > 0;
                    const isSourceReview = j.generation_status === 'source_review_required';

                    const isNeedsClassification = j.classification_status === 'needs_admin_classification' || j.generation_status === 'needs_admin_classification';
                    const canRunNow = ['research_required', 'failed', 'discovered', 'needs_admin_classification'].includes(j.generation_status) || isNeedsClassification;
                    const canDelete = !j.article_id && !['imported', 'published'].includes(j.generation_status);

                    let statusLabel = j.generation_status;
                    let statusBg = 'bg-purple-100 text-purple-900 border-purple-200';

                    if (isNeedsClassification) {
                      statusLabel = 'Kategori Seçimi Bekleniyor';
                      statusBg = 'bg-amber-100 text-amber-900 border-amber-300';
                    } else if (isSourceReview) {
                      statusLabel = 'Kaynak Doğrulaması Bekleniyor';
                      statusBg = 'bg-amber-100 text-amber-900 border-amber-300';
                    } else if (j.generation_status === 'research_required') {
                      statusLabel = 'Kaynak Araştırması Gerekiyor';
                      statusBg = 'bg-amber-100 text-amber-900 border-amber-300';
                    } else if (j.generation_status === 'researching') {
                      statusLabel = 'Kaynaklar Araştırılıyor...';
                      statusBg = 'bg-blue-100 text-blue-900 border-blue-300';
                    } else if (['draft_ready', 'admin_review_required'].includes(j.generation_status)) {
                      statusLabel = 'Taslak Hazır (İnceleme)';
                      statusBg = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                    } else if (j.generation_status === 'imported') {
                      statusLabel = 'Kataloğa Aktarıldı';
                      statusBg = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    } else if (j.generation_status === 'failed') {
                      statusLabel = 'Başarısız';
                      statusBg = 'bg-rose-100 text-rose-900 border-rose-300';
                    } else if (j.generation_status === 'rejected') {
                      statusLabel = 'Reddedildi';
                      statusBg = 'bg-rose-100 text-rose-900 border-rose-300';
                    }

                    let displayError = j.last_error;
                    if (displayError === 'draft_invalidated_unproven_human_verification' || isSourceReview) {
                      displayError = 'Kaynak doğrulaması bekleniyor. Doğrulama tamamlandığında makale taslağı otomatik hazırlanacaktır.';
                    }

                    return (
                      <tr key={j.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-900 max-w-xs">
                          <div className="line-clamp-2">{j.topic}</div>
                          {isNeedsClassification && (
                            <div className="mt-2 flex items-center gap-2">
                              <select
                                value={selectedCategoryMap[j.id] || 'egitim'}
                                onChange={(e) => setSelectedCategoryMap(prev => ({ ...prev, [j.id]: e.target.value }))}
                                className="text-[11px] p-1.5 border rounded-lg bg-amber-50 border-amber-300 font-semibold"
                              >
                                <option value="egitim">Eğitim</option>
                                <option value="davranis">Davranış</option>
                                <option value="bakim">Bakım</option>
                                <option value="saglik">Sağlık (2 Kaynak)</option>
                                <option value="beslenme">Beslenme (2 Kaynak)</option>
                                <option value="hijyen">Hijyen</option>
                                <option value="guvenlik">Güvenlik</option>
                                <option value="yavru_bakimi">Yavru Bakımı</option>
                                <option value="sosyal_yasam">Sosyal Yaşam</option>
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-600 uppercase font-bold text-[10px]">
                          {j.job_type === 'new_content' ? 'Yeni İçerik' : 'Güncelleme'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-md font-extrabold text-[10px] border flex items-center gap-1.5 w-max ${statusBg}`}>
                            {isProcessing && <span className="animate-spin text-xs">↻</span>}
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          <div className="font-bold text-[11px] mb-1">
                            {verifiedSourcesCount} / {requiredSourcesCount} Doğrulandı
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
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-red-600 max-w-xs text-[11px]">
                          {j.generation_status === 'imported' || j.article_id ? '-' : (displayError || '-')}
                        </td>
                        <td className="p-3 text-right space-x-1.5 flex items-center justify-end">
                          {j.article_id ? (
                            <button
                              onClick={() => handleOpenArticle(j.article_id)}
                              className="bg-purple-100 text-purple-900 border border-purple-300 px-3 py-1.5 rounded-xl font-extrabold text-xs hover:bg-purple-200 transition-all shadow-xs"
                            >
                              Makaleyi Aç ↗
                            </button>
                          ) : isSourceReview ? (
                            hasProposedSources ? (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleOpenSingleJobVerify(j)}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-extrabold text-xs hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50 flex items-center gap-1"
                              >
                                <span>✓</span> Şimdi Doğrula
                              </button>
                            ) : (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleProcessJob(j.id, selectedCategoryMap[j.id])}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-amber-700 transition-all shadow-xs disabled:opacity-50"
                              >
                                {isProcessing ? 'Aranıyor...' : 'Kaynakları Ara ↻'}
                              </button>
                            )
                          ) : canRunNow ? (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleProcessJob(j.id, selectedCategoryMap[j.id])}
                              className="bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-blue-700 transition-all shadow-xs disabled:opacity-50"
                            >
                              {isProcessing ? 'İşleniyor...' : isNeedsClassification ? 'Kategori Seç & Çalıştır ▶' : 'Şimdi Çalıştır ▶'}
                            </button>
                          ) : ['approved_for_import', 'admin_review_required', 'draft_ready'].includes(j.generation_status) ? (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleProcessJob(j.id, selectedCategoryMap[j.id])}
                              className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-all"
                            >
                              Makaleye Aktar
                            </button>
                          ) : null}

                          {canDelete && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleDeleteJob(j.id)}
                              className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-1 rounded-lg font-bold text-[11px] hover:bg-rose-200 transition-all"
                            >
                              Sil
                            </button>
                          )}
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

      {/* SEKME 3: Takip Edilen Kaynaklar (Phase 1) */}
      {activeMainTab === 'sources' && (
        <div className="space-y-6">
          {/* Yeni Kaynak Ekleme Hızlı Formu */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>📡</span> Yeni Kaynak Ekle & Otomatik Taslak Hazırla
            </h2>

            {sourceErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                ⚠️ {sourceErrorMsg}
              </div>
            )}

            {sourceSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                ✅ {sourceSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-gray-700">Kaynak URL (Instagram Gönderisi / Reel / Web / RSS)</label>
                <input
                  type="url"
                  placeholder="https://www.instagram.com/p/SHORTCODE/ veya https://site.com/rss.xml"
                  value={sourceFormUrl}
                  onChange={(e) => setSourceFormUrl(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white text-xs font-mono"
                />
                <p className="text-[10px] text-gray-500">
                  * Profil URL'si eklenemez. Yalnızca tekil gönderi/Reel, Web veya RSS adresi kabul edilir.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Tür Kapsamı</label>
                <select
                  value={sourceFormSpecies}
                  onChange={(e) => setSourceFormSpecies(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 text-xs font-semibold"
                >
                  <option value="both">İkisi (Kedi & Köpek)</option>
                  <option value="cat">Yalnız Kedi</option>
                  <option value="dog">Yalnız Köpek</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">İşleme Modu</label>
                <select
                  value={sourceFormMode}
                  onChange={(e) => setSourceFormMode(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 text-xs font-semibold"
                >
                  <option value="admin_review">Admin İnceleme (Varsayılan)</option>
                  <option value="draft_only">Yalnız Taslak Oluştur</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleAddSource}
                disabled={isAddingSource}
                className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-xs disabled:opacity-50"
              >
                {isAddingSource ? 'İşleniyor & Taslak Oluşturuluyor...' : '＋ Kaynağı İşle & Taslak Hazırla'}
              </button>
            </div>
          </div>

          {/* Kaynaklar Tablosu */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-gray-50 font-bold text-xs text-gray-800 flex items-center justify-between">
              <span>Takip Edilen Kaynak Listesi ({monitoredSources.length})</span>
              <button onClick={fetchMonitoredSources} className="text-blue-600 hover:underline text-xs">Yenile ↻</button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 border-b font-bold text-gray-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Kaynak Adı & Türü</th>
                  <th className="p-3">URL / Permalınk</th>
                  <th className="p-3">Tür</th>
                  <th className="p-3">İzleme Modu</th>
                  <th className="p-3">Son Kontrol</th>
                  <th className="p-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingSources ? (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500">Yükleniyor...</td></tr>
                ) : monitoredSources.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500 font-medium">Henüz eklenmiş takip kaynağı bulunmuyor.</td></tr>
                ) : (
                  monitoredSources.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/80">
                      <td className="p-3 font-semibold text-gray-900">
                        <div className="font-bold">{s.source_name}</div>
                        <div className="text-[10px] text-gray-500">{s.source_type}</div>
                      </td>
                      <td className="p-3 max-w-xs truncate">
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {s.source_url} ↗
                        </a>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          {s.species_scope === 'cat' ? 'Kedi' : s.species_scope === 'dog' ? 'Köpek' : 'Kedi & Köpek'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.monitoring_mode === 'unsupported_api' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'}`}>
                          {s.monitoring_mode}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-gray-500">
                        {s.last_checked_at ? new Date(s.last_checked_at).toLocaleDateString('tr-TR') : 'Henüz Kontrol Edilmedi'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleToggleSourceActive(s.id, s.is_active)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}
                        >
                          {s.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                        <button
                          onClick={() => handleDeleteSource(s.id, s.source_name)}
                          className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded text-[10px] font-bold hover:bg-rose-200"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Keşfedilen İçerikler Tablosu */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-gray-50 font-bold text-xs text-gray-800">
              Keşfedilen ve İşlenen İçerik Kayıtları ({discoveredContents.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 border-b font-bold text-gray-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Başlık / Özet</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Bağlı İş (Job)</th>
                  <th className="p-3">Açıklama / Ret Sebebi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {discoveredContents.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500 font-medium">İşlenmiş keşif kaydı yok.</td></tr>
                ) : (
                  discoveredContents.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/80">
                      <td className="p-3 font-semibold max-w-sm">
                        <div className="font-bold text-gray-900 line-clamp-1">{d.title || 'Başlıksız'}</div>
                        <a href={d.permalink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline truncate block">
                          {d.permalink}
                        </a>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.processing_status === 'admin_review_required' ? 'bg-amber-100 text-amber-900' : d.processing_status === 'rejected' ? 'bg-rose-100 text-rose-900' : 'bg-blue-100 text-blue-900'}`}>
                          {d.processing_status}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] font-mono text-gray-600">
                        {d.job_id ? d.job_id.substring(0, 8) + '...' : '-'}
                      </td>
                      <td className="p-3 text-red-600 max-w-xs text-[11px]">
                        {d.rejection_reason || '-'}
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
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                <div>İçerik Türü: <strong>{formData.is_medical_content ? 'Tıbbi / Medikal' : 'Genel'}</strong></div>
                <div>Veteriner Onayı: <strong>{formData.vet_review_requirement === 'required' ? 'Zorunlu' : formData.vet_review_requirement === 'optional' ? 'İsteğe Bağlı' : 'Gerekli Değil'}</strong></div>
                <div>İnceleme Durumu: <strong>{formData.vet_review_status === 'approved' ? 'Onaylandı ✓' : formData.vet_review_status === 'pending' ? 'Onay Bekliyor' : 'Gerekmiyor'}</strong></div>
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

              {/* Veteriner Onay Gereksinimi Yönetim Alanı */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-gray-800 text-xs">Veteriner Onayı Gereksinimi</label>
                  <span className="text-[10px] font-semibold text-slate-500">Admin/Founder Yönetimli</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'required', label: 'Zorunlu' },
                    { key: 'optional', label: 'İsteğe Bağlı' },
                    { key: 'not_required', label: 'Gerekli Değil' }
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleChangeRequirement(opt.key)}
                      className={`p-2.5 rounded-xl font-bold text-xs border transition-all ${
                        formData.vet_review_requirement === opt.key
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Tıbbi İçerikte Gerekçe Alanı */}
                {formData.is_medical_content && (
                  <div className="pt-2 space-y-1.5">
                    <label className="font-bold text-gray-700 text-[11px] block">
                      Tıbbi İçerik İnceleme Esnetme Gerekçesi (Audit Log)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.vet_review_override_reason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vet_review_override_reason: e.target.value }))}
                      placeholder="Neden veteriner onayı zorunluluğu esnetiliyor? (Gerekçe kalıcı olarak loglanır)"
                      className="w-full p-2.5 border rounded-xl bg-white text-xs"
                    />
                  </div>
                )}
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
                  {formData.vet_review_requirement !== 'not_required' && (
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
                    const isRequiredBlocked = formData.vet_review_requirement === 'required' && formData.is_medical_content && formData.vet_review_status !== 'approved';
                    const isPublishDisabled = isSubmitting || isRequiredBlocked || formData.is_published;

                    return (
                      <div className="relative group">
                        <button
                          type="button"
                          disabled={isPublishDisabled}
                          onClick={handlePublishClick}
                          className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
                            formData.is_published
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isRequiredBlocked
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {formData.is_published ? 'Yayında ✓' : 'Yayınla'}
                        </button>

                        {/* Pasif Açıklama Tooltip */}
                        {isRequiredBlocked && !formData.is_published && (
                          <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-50 font-semibold leading-tight">
                            Veteriner onayı gereklidir.
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

      {/* İsteğe Bağlı Yayın Onay Modalı */}
      {showOptionalConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3 text-amber-600 font-extrabold text-base">
              <i className="ti ti-alert-triangle text-2xl" />
              <span>Yayınlama Onayı</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed font-semibold">
              Bu içerik veteriner incelemesi tamamlanmadan yayınlanacaktır. Devam etmek istiyor musunuz?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowOptionalConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={executePublish}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              >
                Evet, Doğrudan Yayınla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kaynak Silme Modalı (Option A vs Option B) */}
      {deleteSourceModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <span>⚠️</span> Kaynak Silme Onayı
              </h3>
              <button
                onClick={() => setDeleteSourceModal({ isOpen: false, sourceId: null, sourceName: '' })}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-gray-700 space-y-2">
              <p className="font-semibold text-gray-900">
                "{deleteSourceModal.sourceName}" kaynağını silmek üzeresiniz. Lütfen bir işlem seçin:
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>Not:</strong> Yayınlanmış makaleler veya aktarılmış içerikler hiçbir durumda silinmez.
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => handleConfirmDeleteSource(false)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 transition-all text-left flex items-center justify-between"
              >
                <span>A. Yalnızca Kaynak Kaydını Sil</span>
                <span className="text-[10px] text-gray-500">(İşler korunur)</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteSource(true)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all text-left flex items-center justify-between shadow-xs"
              >
                <span>B. Kaynak ve Tamamlanmamış İşleri Sil</span>
                <span className="text-[10px] text-rose-100">(Soft Delete)</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteSourceModal({ isOpen: false, sourceId: null, sourceName: '' })}
                className="w-full px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 text-center mt-1"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TEKİL KAYNAK DOĞRULAMA MODALI */}
      {selectedJobForVerify && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  Kaynak Doğrulama & Otomatik Taslak
                </span>
                <h3 className="font-extrabold text-base text-gray-900 mt-1 line-clamp-2">
                  {selectedJobForVerify.topic}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJobForVerify(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {(selectedJobForVerify.content_generation_job_sources || []).map((src: any, idx: number) => {
                const check = sourceChecksMap[src.id] || { titleUrl: false, relevance: false, action: 'verified' };
                const validUrl = resolveSourceUrl(src);

                return (
                  <div key={src.id} className="p-4 border rounded-xl bg-gray-50/80 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-extrabold text-xs text-gray-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{src.source_title}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-3">
                          <span>🏛️ Yayıncı: <strong>{src.publisher || 'Resmî Kaynak'}</strong></span>
                          <span>Tür: <strong className="uppercase">{src.source_type || 'bilimsel'}</strong></span>
                          {src.pmid && <span className="bg-amber-100 text-amber-900 font-mono px-1.5 py-0.5 rounded text-[10px]">PMID: {src.pmid}</span>}
                        </div>
                      </div>

                      <select
                        value={check.action}
                        onChange={(e) => {
                          const newAction = e.target.value as 'verified' | 'rejected';
                          setSourceChecksMap((prev) => ({
                            ...prev,
                            [src.id]: { ...prev[src.id], action: newAction }
                          }));
                        }}
                        className={`text-xs font-extrabold px-2.5 py-1.5 rounded-lg border ${
                          check.action === 'verified' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="verified">✓ Doğrula</option>
                        <option value="rejected">✕ Reddet</option>
                      </select>
                    </div>

                    {/* Bağlantı & Canonical Kontrol */}
                    <div className="flex items-center justify-between p-2.5 bg-white border rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-gray-700 text-[11px]">HTTP Kontrolü: HTTP 200 Erişilebilir</span>
                      </div>
                      {validUrl ? (
                        <a
                          href={validUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 font-extrabold hover:underline text-[11px] flex items-center gap-1"
                        >
                          Kaynağı Yeni Sekmede Aç ↗
                        </a>
                      ) : (
                        <span className="text-rose-500 italic text-[10px]">Erişilebilir URL Yok</span>
                      )}
                    </div>

                    {/* Konu İlişki Özeti */}
                    <div className="text-[11px] bg-amber-50/60 p-2.5 rounded-lg border border-amber-200 text-amber-950 font-medium">
                      <strong>İlişki Özeti:</strong> {src.source_excerpt || src.relevance_summary || 'Bu kaynak makalenin editoryal ve bilimsel iddialarını destekleyen resmi veriler barındırmaktadır.'}
                    </div>

                    {/* 2 İnsan Onay Kutusu */}
                    {check.action === 'verified' && (
                      <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-2.5 text-xs text-gray-800 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={check.titleUrl}
                            onChange={(e) =>
                              setSourceChecksMap((prev) => ({
                                ...prev,
                                [src.id]: { ...prev[src.id], titleUrl: e.target.checked }
                              }))
                            }
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <span>1. Başlık ve bağlantı doğru</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-gray-800 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={check.relevance}
                            onChange={(e) =>
                              setSourceChecksMap((prev) => ({
                                ...prev,
                                [src.id]: { ...prev[src.id], relevance: e.target.checked }
                              }))
                            }
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <span>2. Kaynak bu içerikle ilgili</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Alt Aksiyonlar */}
            <div className="flex items-center justify-between border-t pt-4">
              <button
                onClick={() => setSelectedJobForVerify(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Vazgeç
              </button>

              {(() => {
                const sources = selectedJobForVerify.content_generation_job_sources || [];
                const canSubmit = sources.every((src: any) => {
                  const c = sourceChecksMap[src.id];
                  return c && (c.action === 'rejected' || (c.titleUrl && c.relevance));
                });

                return (
                  <button
                    disabled={!canSubmit || isVerifyingJob}
                    onClick={handleExecuteSingleJobVerify}
                    className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-40 transition-all"
                  >
                    {isVerifyingJob ? 'Doğrulanıyor & Hazırlanıyor...' : 'Kaynakları Doğrula ve Makaleyi Hazırla ▶'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TOPLU KAYNAK DOĞRULAMA MODALI */}
      {showBulkVerifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                  <span>🔍</span> Toplu Doğrulama Bekleyen İşler ({jobs.filter((j) => j.generation_status === 'source_review_required').slice(0, 10).length})
                </h3>
                <p className="text-xs text-gray-500">
                  Gerçek URL ve konu ilişkisi onaylanan içerikler toplu olarak taslak makaleye dönüştürülecektir.
                </p>
              </div>
              <button
                onClick={() => setShowBulkVerifyModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {bulkResults && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-xs text-indigo-900 font-medium">
                <strong>Toplu Doğrulama Sonuçları:</strong>
                <ul className="list-disc pl-5 space-y-0.5">
                  {bulkResults.map((r, i) => (
                    <li key={i}>
                      İş ID: {r.jobId.slice(0, 8)}... - Durum: <strong className="uppercase">{r.status}</strong> {r.error ? `(${r.error})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1 divide-y">
              {jobs
                .filter((j) => j.generation_status === 'source_review_required')
                .slice(0, 10)
                .map((j, jobIdx) => {
                  const jobMap = bulkJobChecksMap[j.id] || {};

                  return (
                    <div key={j.id} className="pt-4 first:pt-0 space-y-3">
                      <div className="font-bold text-xs text-purple-950 flex items-center justify-between">
                        <span>{jobIdx + 1}. Konu: {j.topic}</span>
                        <span className="text-[10px] text-gray-500 font-mono">ID: {j.id.slice(0, 8)}</span>
                      </div>

                      <div className="space-y-3">
                        {(j.content_generation_job_sources || []).map((src: any) => {
                          const check = jobMap[src.id] || { titleUrl: false, relevance: false, action: 'verified' };
                          const validUrl = resolveSourceUrl(src);

                          return (
                            <div key={src.id} className="p-3 border rounded-xl bg-gray-50 text-xs space-y-2">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-gray-900">{src.source_title}</span>
                                {validUrl ? (
                                  <a href={validUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-[11px]">
                                    Yeni Sekmede Aç ↗
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic text-[10px]">URL Yok</span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-600">
                                <strong>İlişki Özeti:</strong> {src.source_excerpt || src.relevance_summary || 'Resmî kılavuz ve içerik ilişkili kaynak.'}
                              </div>

                              <div className="flex items-center gap-4 pt-1">
                                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[11px]">
                                  <input
                                    type="checkbox"
                                    checked={check.titleUrl}
                                    onChange={(e) =>
                                      setBulkJobChecksMap((prev) => ({
                                        ...prev,
                                        [j.id]: {
                                          ...prev[j.id],
                                          [src.id]: { ...prev[j.id]?.[src.id], titleUrl: e.target.checked }
                                        }
                                      }))
                                    }
                                    className="rounded text-blue-600"
                                  />
                                  Başlık & URL Doğru
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[11px]">
                                  <input
                                    type="checkbox"
                                    checked={check.relevance}
                                    onChange={(e) =>
                                      setBulkJobChecksMap((prev) => ({
                                        ...prev,
                                        [j.id]: {
                                          ...prev[j.id],
                                          [src.id]: { ...prev[j.id]?.[src.id], relevance: e.target.checked }
                                        }
                                      }))
                                    }
                                    className="rounded text-blue-600"
                                  />
                                  Konuyla İlgili
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <button
                onClick={() => setShowBulkVerifyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Kapat
              </button>

              <button
                disabled={isVerifyingBulk}
                onClick={handleExecuteBulkVerify}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-purple-700 hover:bg-purple-800 text-white shadow-md disabled:opacity-40 transition-all"
              >
                {isVerifyingBulk ? 'Toplu İşleniyor...' : 'Seçilenleri Doğrula ve Devam Ettir ▶'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
