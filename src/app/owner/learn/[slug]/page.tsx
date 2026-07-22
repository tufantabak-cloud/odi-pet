import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import ArticleViewTracker from './ArticleViewTracker';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt')
    .eq('slug', slug)
    .maybeSingle();

  if (!article) return { title: 'İçerik Bulunamadı | Odi.Pet' };
  return {
    title: `${article.title} | Odi.Pet`,
    description: article.excerpt
  };
}

export default async function ArticleDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pet_id?: string }>;
}) {
  const { slug } = await params;
  const { pet_id: petId } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const user = await getSessionUser();

  // 1. Makaleyi Çek (Read-Only)
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // 2. Güvenlik Denetimleri
  if (error || !article || !article.is_published) {
    notFound();
  }

  // Tıbbi onay denetimi
  if (article.is_medical_content && article.vet_review_status !== 'approved' && article.vet_review_status !== 'not_required') {
    notFound();
  }

  // 3. Yönetilen Kaynakları Çek (Yalnızca is_active = true olanlar)
  const { data: rawSources } = await supabase
    .from('article_sources')
    .select('*')
    .eq('article_id', article.id)
    .eq('is_active', true);

  const activeSources = rawSources || [];

  // Kaynakları 2 Gruba Ayır
  const scientificSources = activeSources.filter((s) =>
    ['scientific', 'pubmed', 'official_guideline', 'official'].includes(s.source_type)
  );

  const additionalSources = activeSources.filter((s) =>
    ['web_page', 'instagram_post', 'instagram_profile', 'reputable_editorial', 'manual_reference'].includes(s.source_type)
  );

  // 4. Medya Görsellerini Çek
  const { data: rawMedia } = await supabase
    .from('article_media')
    .select('*')
    .eq('article_id', article.id)
    .eq('is_active', true)
    .neq('rights_status', 'unknown')
    .order('display_order', { ascending: true });

  const activeMedia = rawMedia || [];

  const featuredMedia = activeMedia.find((m) => m.media_type === 'featured_image');
  const contentMediaList = activeMedia.filter((m) => m.media_type === 'content_image');
  const galleryMediaList = activeMedia.filter((m) => m.media_type === 'gallery_image').slice(0, 8);

  const coverUrl = featuredMedia?.external_url || featuredMedia?.storage_path || article.cover_url;

  const vetReviewedDate = article.vet_reviewed_at
    ? new Date(article.vet_reviewed_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Etkileşim Takipçisi */}
      {petId && <ArticleViewTracker petId={petId} articleId={article.id} />}

      {/* Üst Navigasyon */}
      <div className="flex items-center justify-between">
        <Link
          href="/owner/learn"
          className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          ← Rehber Kütüphanesine Dön
        </Link>
        <span className="text-[10px] text-[var(--color-text-muted)] font-600">
          {article.read_time_minutes || 3} dk okuma süresi
        </span>
      </div>

      {/* Makale Başlık & Kategori Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-800 text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2.5 py-1 rounded-md uppercase tracking-wider">
            {article.category || 'genel'}
          </span>
          {article.is_medical_content && (
            <span className="text-[10px] font-800 text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
              Veteriner Onaylı İçerik
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)] leading-tight">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] leading-relaxed italic border-l-2 border-[var(--color-primary)] pl-3">
            {article.excerpt}
          </p>
        )}
      </div>

      {/* Kapak Görseli */}
      {coverUrl && (
        <div className="w-full h-56 md:h-80 rounded-2xl overflow-hidden bg-gray-100 shadow-sm relative">
          <img
            src={coverUrl}
            alt={featuredMedia?.alt_text || article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {featuredMedia?.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white p-2.5 text-[11px] font-medium">
              {featuredMedia.caption}
              {featuredMedia.source_name && <span className="opacity-80 ml-1">({featuredMedia.source_name})</span>}
            </div>
          )}
        </div>
      )}

      {/* Medikal Uyarı Kutusu */}
      {article.is_medical_content && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 shadow-xs">
          <i className="ti ti-alert-triangle text-amber-600 text-xl shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-amber-950">Medikal Uyarı</p>
            <p className="font-semibold leading-relaxed">
              Bu içerik genel bilgilendirme amaçlıdır. Teşhis ve tedavi için veteriner hekiminize danışın.
            </p>
          </div>
        </div>
      )}

      {/* Tam İçerik Metni */}
      <div className="prose max-w-none text-xs md:text-sm text-[var(--color-text-primary)] leading-relaxed space-y-4">
        {article.content.split('\n\n').map((paragraph: string, idx: number) => (
          <div key={idx} className="space-y-4">
            <p>{paragraph}</p>

            {/* Araya giren içerik görseli */}
            {contentMediaList[idx] && (
              <div className="my-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-2 space-y-2">
                <img
                  src={contentMediaList[idx].external_url || contentMediaList[idx].storage_path}
                  alt={contentMediaList[idx].alt_text}
                  className="w-full h-48 md:h-64 object-cover rounded-lg"
                  loading="lazy"
                />
                {contentMediaList[idx].caption && (
                  <p className="text-[11px] text-gray-600 italic px-1 font-medium">
                    {contentMediaList[idx].caption}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fotoğraf Galerisi */}
      {galleryMediaList.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
            <span>📷</span> Fotoğraf Galerisi ({galleryMediaList.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {galleryMediaList.map((gMedia: any) => (
              <div key={gMedia.id} className="group relative rounded-xl overflow-hidden border bg-gray-100 h-28">
                <img
                  src={gMedia.external_url || gMedia.storage_path}
                  alt={gMedia.alt_text}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {gMedia.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[9px] p-1 truncate">
                    {gMedia.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kaynaklar Bölümü (İki Gruplu Gösterim) */}
      <div className="border-t border-[var(--color-border)] pt-4 space-y-4">
        {vetReviewedDate && (
          <p className="text-[11px] text-[var(--color-text-muted)] font-600 flex items-center gap-1.5">
            <i className="ti ti-circle-check-filled text-emerald-600" />
            <span>Son veteriner kontrol tarihi: <strong>{vetReviewedDate}</strong></span>
          </p>
        )}

        {/* Grup 1: Doğrulanmış Bilimsel Kaynaklar */}
        {scientificSources.length > 0 && (
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-xs space-y-2">
            <p className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>🔬</span> Doğrulanmış Bilimsel & Tıbbi Kaynaklar ({scientificSources.length})
            </p>
            <div className="divide-y divide-emerald-200/60">
              {scientificSources.map((src: any) => (
                <div key={src.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-bold text-gray-900 text-[11px]">
                      {src.publisher || 'PubMed'} — {src.source_title}
                    </div>
                  </div>
                  {src.source_url && (
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-bold hover:underline text-[11px] shrink-0 inline-flex items-center gap-0.5"
                    >
                      <span>Makaleyi İncele ↗</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grup 2: Ek Kaynaklar & Harici Bağlantılar */}
        {additionalSources.length > 0 && (
          <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 text-xs space-y-2">
            <p className="font-extrabold text-purple-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>🔗</span> Ek Kaynaklar & Harici Bağlantılar ({additionalSources.length})
            </p>
            <div className="divide-y divide-purple-200/60">
              {additionalSources.map((src: any) => (
                <div key={src.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-gray-800 text-[11px]">
                      {src.publisher || 'Web'} — {src.source_title}
                    </div>
                  </div>
                  {src.source_url && (
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-700 font-bold hover:underline text-[11px] shrink-0 inline-flex items-center gap-0.5"
                    >
                      <span>Bağlantıya Git ↗</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}