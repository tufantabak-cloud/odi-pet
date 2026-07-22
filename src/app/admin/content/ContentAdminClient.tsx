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

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    is_published: false
  });

  const fetchArticles = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (filterQuery) params.set('q', filterQuery);
      if (filterCategory) params.set('category', filterCategory);
      if (filterSpecies) params.set('species', filterSpecies);
      if (filterStatus) params.set('status', filterStatus);
      if (filterMedical) params.set('is_medical', filterMedical);
      if (filterVetStatus) params.set('vet_status', filterVetStatus);

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
  }, [filterQuery, filterCategory, filterSpecies, filterStatus, filterMedical, filterVetStatus]);

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
      is_published: false
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
      is_published: Boolean(article.is_published)
    });
    setErrorMsg('');
    setIsModalOpen(true);
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

      setSuccessMsg(editingId ? 'İçerik başarıyla güncellendi.' : 'Yeni içerik başarıyla oluşturuldu.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setIsModalOpen(false);
      fetchArticles();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dinamik Irk Listesi (Seçili tür filtrelerine göre)
  const availableBreeds = ALL_BREEDS.filter((b) => {
    if (formData.species_filter.length === 0) return true;
    if (b.species === 'both') return true;
    return formData.species_filter.includes(b.species);
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Üst Başlık & Ekle Butonu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]">İçerik Yönetimi</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Aktif pet profiline özel kişiselleştirilmiş içerik ve rehber akışını yönetin.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm self-start md:self-auto"
        >
          + Yeni İçerik Ekle
        </button>
      </div>

      {/* Bildirimler */}
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

      {/* Filtre Barı */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Arama */}
          <input
            type="text"
            placeholder="Arama yapın..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
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
            <option value="bakim">Tüy & Hijyen Bakımı</option>
            <option value="guvenlik">Güvenlik & Açık Alan</option>
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

          {/* Yayın Durumu */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="">Tüm Durumlar</option>
            <option value="published">Yayında</option>
            <option value="draft">Taslak</option>
          </select>

          {/* Tıbbi Durum */}
          <select
            value={filterMedical}
            onChange={(e) => setFilterMedical(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="">Tüm İçerikler</option>
            <option value="true">Tıbbi İçerik</option>
            <option value="false">Genel İçerik</option>
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
        </div>
      </div>

      {/* Liste Tablosu / Kartlar */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 font-medium">Yükleniyor...</div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 font-medium">
            Filtrelere uygun içerik bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Başlık / Slug</th>
                  <th className="p-3.5">Kategori / Tür</th>
                  <th className="p-3.5">Hedefleme Özeti</th>
                  <th className="p-3.5">Tıbbi / Vet Durumu</th>
                  <th className="p-3.5">Yayın Durumu</th>
                  <th className="p-3.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {articles.map((art) => (
                  <tr key={art.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-gray-900 truncate">{art.title}</div>
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
                    <td className="p-3.5 max-w-xs">
                      <div className="text-[10px] text-gray-600 space-y-0.5">
                        {art.target_breed_keys?.length > 0 && (
                          <div><strong className="text-gray-800">Irk:</strong> {art.target_breed_keys.join(', ')}</div>
                        )}
                        {art.target_life_stages?.length > 0 && (
                          <div><strong className="text-gray-800">Evre:</strong> {art.target_life_stages.join(', ')}</div>
                        )}
                        {(!art.target_breed_keys?.length && !art.target_life_stages?.length) && (
                          <span className="text-gray-400">Genel Bakım</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {art.is_medical_content ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          art.vet_review_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          Tıbbi ({art.vet_review_status})
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500">Genel İçerik</span>
                      )}
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
                        onClick={() => handleOpenEditModal(art)}
                        className="text-indigo-600 hover:text-indigo-900 font-bold"
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* İçerik Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-black text-gray-900">
                {editingId ? 'İçeriği Düzenle' : 'Yeni İçerik Ekle'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

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
                    placeholder="Örn: Sıcak Havada Köpek Gezdirme"
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
                    placeholder="sicak-havada-kopek-gezdirme"
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
                  placeholder="Dashboard öneri kartında görünecek 1-2 cümlelik özet metin..."
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
                  placeholder="Detay sayfasında görüntülenecek makale metni..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50"
                  >
                    <option value="genel">Genel Bakım</option>
                    <option value="saglik">Sağlık & Medikal</option>
                    <option value="beslenme">Beslenme</option>
                    <option value="egitim">Eğitim & Davranış</option>
                    <option value="bakim">Tüy & Hijyen Bakımı</option>
                    <option value="guvenlik">Güvenlik</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kapak Görseli URL</label>
                  <input
                    type="text"
                    value={formData.cover_url}
                    onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Okuma Süresi (Dk)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.read_time_minutes}
                    onChange={(e) => setFormData({ ...formData, read_time_minutes: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50"
                  />
                </div>
              </div>

              {/* Hedefleme Ayarları */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-extrabold text-sm text-gray-900">Kişiselleştirilmiş Hedefleme Kuralları</h3>

                {/* Tür Filtresi */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">Hedef Tür (species_filter) *</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.species_filter.includes('cat')}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.species_filter, 'cat']
                            : formData.species_filter.filter((s) => s !== 'cat');
                          setFormData({ ...formData, species_filter: next });
                        }}
                      />
                      Kedi
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.species_filter.includes('dog')}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.species_filter, 'dog']
                            : formData.species_filter.filter((s) => s !== 'dog');
                          setFormData({ ...formData, species_filter: next });
                        }}
                      />
                      Köpek
                    </label>
                  </div>
                </div>

                {/* Irk Seçimi (Dinamik) */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hedef Irklar (target_breed_keys)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 border rounded-xl bg-gray-50">
                    {availableBreeds.map((b) => (
                      <label key={b.key} className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.target_breed_keys.includes(b.key)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...formData.target_breed_keys, b.key]
                              : formData.target_breed_keys.filter((k) => k !== b.key);
                            setFormData({ ...formData, target_breed_keys: next });
                          }}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Irk Özellikleri & Yaşam Evresi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Irk Özellikleri (target_breed_traits)</label>
                    <div className="space-y-1 p-2.5 border rounded-xl bg-gray-50">
                      {[
                        { key: 'long_hair', label: 'Uzun Tüylü' },
                        { key: 'curly_hair', label: 'Kıvırcık Tüylü' },
                        { key: 'brachycephalic', label: 'Basık Burunlu' },
                        { key: 'small_breed', label: 'Küçük Irk' },
                        { key: 'large_breed', label: 'Büyük Irk' }
                      ].map((t) => (
                        <label key={t.key} className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.target_breed_traits.includes(t.key)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...formData.target_breed_traits, t.key]
                                : formData.target_breed_traits.filter((k) => k !== t.key);
                              setFormData({ ...formData, target_breed_traits: next });
                            }}
                          />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Yaşam Evresi (target_life_stages)</label>
                    <div className="space-y-1 p-2.5 border rounded-xl bg-gray-50">
                      {[
                        { key: 'junior', label: 'Yavru (0-1 Yaş)' },
                        { key: 'adult', label: 'Yetişkin (1-7 Yaş)' },
                        { key: 'senior', label: 'Yaşlı (7-12 Yaş)' },
                        { key: 'senior_12plus', label: 'Yaşlı 12+ (12+ Yaş)' }
                      ].map((ls) => (
                        <label key={ls.key} className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.target_life_stages.includes(ls.key)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...formData.target_life_stages, ls.key]
                                : formData.target_life_stages.filter((k) => k !== ls.key);
                              setFormData({ ...formData, target_life_stages: next });
                            }}
                          />
                          {ls.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tıbbi Güvenlik & Yayınlama Ayarları */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-extrabold text-sm text-gray-900">Tıbbi Onay & Yayın Güvenliği</h3>

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
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      Tıbbi içerikler veteriner hekim onayı (approved) olmadan canlıda yayınlanamaz.
                    </p>
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
                  <label className="block font-bold text-gray-700 mb-1">Medikal / Bilimsel Kaynaklar</label>
                  <textarea
                    rows={2}
                    value={formData.references_list}
                    onChange={(e) => setFormData({ ...formData, references_list: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 text-[11px]"
                    placeholder="Her satıra bir kaynak yazın..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <label className="flex items-center gap-2 font-black text-sm text-gray-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      />
                      Canlıda Yayınla (is_published = true)
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
                      {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
