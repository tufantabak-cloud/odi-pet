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
  if (article.is_medical_content && article.vet_review_status !== 'approved') {
    notFound();
  }

  // Kaydedilme Durumu
  let isSaved = false;
  if (user) {
    const { data: saveRecord } = await supabase
      .from('article_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', article.id)
      .maybeSingle();
    isSaved = Boolean(saveRecord);
  }

  const vetReviewedDate = article.vet_reviewed_at
    ? new Date(article.vet_reviewed_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Etkileşim Takipçisi (İstemci Tarafında viewed Gönderir) */}
      {petId && <ArticleViewTracker petId={petId} articleId={article.id} />}

      {/* Üst Navigasyon */}
      <div className="flex items-center justify-between">
        <Link
          href="/owner/dashboard"
          className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          ← Dashboard'a Dön
        </Link>
        <span className="text-[10px] text-[var(--color-text-muted)] font-600">
          {article.read_time_minutes || 3} dk okuma süresi
        </span>
      </div>

      {/* Makale Kartı Header */}
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
      {article.cover_url && (
        <div className="w-full h-56 md:h-72 rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          <img src={article.cover_url} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Tıbbi İçerik Sabit Uyarı Kutusu */}
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
          <p key={idx}>{paragraph}</p>
        ))}
      </div>

      {/* Dipnot / Kaynakça & Veteriner Onay Tarihi */}
      <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
        {vetReviewedDate && (
          <p className="text-[11px] text-[var(--color-text-muted)] font-600 flex items-center gap-1.5">
            <i className="ti ti-circle-check-filled text-emerald-600" />
            <span>Son veteriner kontrol tarihi: <strong>{vetReviewedDate}</strong></span>
          </p>
        )}

        {article.references_list && article.references_list.length > 0 && (
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/60 text-xs space-y-1.5">
            <p className="font-bold text-gray-800 text-[11px] uppercase tracking-wider">Tıbbi & Bilimsel Kaynaklar:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600 font-medium">
              {article.references_list.map((ref: string, i: number) => (
                <li key={i}>{ref}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}