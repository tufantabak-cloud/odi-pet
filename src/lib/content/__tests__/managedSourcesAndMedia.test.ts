import { describe, it, expect } from 'vitest';
import { validateArticlePublishability } from '../contentPublishGuard';

describe('Step 8: Managed External Sources & Visual Article Media Tests', () => {

  it('rejects instagram_post if source_url domain is not instagram.com', () => {
    const result = validateArticlePublishability({
      article: {
        id: 'art-1',
        is_published: true,
        is_medical_content: false,
        vet_review_status: 'not_required'
      },
      sources: [
        {
          source_title: 'Fake Instagram Post',
          source_type: 'instagram_post',
          source_url: 'https://otherdomain.com/p/12345',
          verification_status: 'verified'
        }
      ]
    });

    expect(result.canPublish).toBe(false);
    expect(result.blockers.some((b) => b.includes('instagram.com'))).toBe(true);
  });

  it('allows instagram_post if domain is instagram.com', () => {
    const result = validateArticlePublishability({
      article: {
        id: 'art-1',
        is_published: true,
        is_medical_content: false,
        vet_review_status: 'not_required'
      },
      sources: [
        {
          source_title: 'Valid Instagram Post',
          source_type: 'instagram_post',
          source_url: 'https://www.instagram.com/p/C3x9189tXyZ/',
          verification_status: 'verified'
        }
      ]
    });

    expect(result.canPublish).toBe(true);
  });

  it('rejects publishing if image rights_status is unknown', () => {
    const result = validateArticlePublishability({
      article: {
        id: 'art-1',
        is_published: true,
        is_medical_content: false,
        vet_review_status: 'not_required'
      },
      media: [
        {
          media_type: 'featured_image',
          alt_text: 'Valid alt text',
          rights_status: 'unknown',
          is_active: true
        }
      ]
    });

    expect(result.canPublish).toBe(false);
    expect(result.blockers.some((b) => b.includes('unknown'))).toBe(true);
  });

  it('rejects publishing if active image has empty alt_text', () => {
    const result = validateArticlePublishability({
      article: {
        id: 'art-1',
        is_published: true,
        is_medical_content: false,
        vet_review_status: 'not_required'
      },
      media: [
        {
          media_type: 'featured_image',
          alt_text: '',
          rights_status: 'licensed',
          is_active: true
        }
      ]
    });

    expect(result.canPublish).toBe(false);
    expect(result.blockers.some((b) => b.includes('alt_text') || b.includes('alt metin'))).toBe(true);
  });

  it('blocks publication of medical content without approved vet status', () => {
    const result = validateArticlePublishability({
      article: {
        id: 'art-1',
        is_published: true,
        is_medical_content: true,
        vet_review_status: 'pending'
      }
    });

    expect(result.canPublish).toBe(false);
    expect(result.blockers.some((b) => b.includes('veteriner hekim onayı'))).toBe(true);
  });

});
