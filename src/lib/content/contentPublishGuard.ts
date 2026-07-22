export interface ArticlePublishGuardParams {
  article: {
    id: string;
    is_published: boolean;
    is_medical_content: boolean;
    vet_review_status: string;
    vet_review_requirement?: string;
  };
  sources?: any[];
  media?: any[];
}

export interface PublishGuardResult {
  canPublish: boolean;
  blockers: string[];
}

export function validateArticlePublishability(params: ArticlePublishGuardParams): PublishGuardResult {
  const blockers: string[] = [];
  const { article, sources = [], media = [] } = params;

  // 1. Tıbbi içerik veteriner onay bariyeri
  const req = article.vet_review_requirement || (article.is_medical_content ? 'required' : 'not_required');
  if (req === 'required' && article.is_medical_content && article.vet_review_status !== 'approved') {
    blockers.push('Tıbbi içerikler veteriner hekim onayı (approved) olmadan yayınlanamaz.');
  }

  // 2. Kaynak URL ve Doğrulama Kontrolü
  sources.forEach((src) => {
    if (src.source_url) {
      try {
        const u = new URL(src.source_url);
        if (u.protocol !== 'https:') {
          blockers.push(`"${src.source_title}" kaynağı güvenli HTTPS adresine sahip olmalıdır.`);
        }
      } catch {
        blockers.push(`"${src.source_title}" kaynağının URL adresi geçersizdir.`);
      }
    }

    if (['pubmed', 'scientific_article', 'official_guideline'].includes(src.source_type) && src.verification_status !== 'verified') {
      blockers.push(`"${src.source_title}" bilimsel/tıbbi kaynağının insan doğrulaması (verified) tamamlanmalıdır.`);
    }

    // Instagram Domain Kontrolü
    if (['instagram_post', 'instagram_profile'].includes(src.source_type) && src.source_url) {
      try {
        const host = new URL(src.source_url).hostname.toLowerCase();
        if (host !== 'instagram.com' && host !== 'www.instagram.com') {
          blockers.push(`"${src.source_title}" Instagram kaynağı instagram.com domain adresinden olmalıdır.`);
        }
      } catch {
        blockers.push(`"${src.source_title}" Instagram adresi geçersizdir.`);
      }
    }
  });

  // 3. Görsel Medya Hak ve Alt Text Kontrolü
  const activeMedia = media.filter((m) => m.is_active !== false);

  activeMedia.forEach((m) => {
    if (!m.alt_text || !m.alt_text.trim()) {
      blockers.push(`Erişilebilirlik kuralı: Görsel için alt metin (alt_text) zorunludur.`);
    }

    if (!m.rights_status || m.rights_status === 'unknown') {
      blockers.push(`Telif güvenliği: Kullanım hakkı "unknown" olan görseller yayınlanamaz.`);
    }
  });

  return {
    canPublish: blockers.length === 0,
    blockers
  };
}
