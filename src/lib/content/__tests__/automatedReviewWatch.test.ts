/**
 * Odi.Pet — Automated Content Review Watch Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';
import { runContentReviewWatch } from '../contentReviewWatch';
import { isArticleEligibleForUser } from '../contentHelpers';

describe('Automated Content Review Watch Rules', () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

  it('1. Daily watch task runs idempotently and produces identical alert counts', async () => {
    const mockSupabase: any = {
      from: (table: string) => {
        if (table === 'articles') {
          return {
            select: () => ({
              data: [
                { id: '1', title: 'Eski', next_review_at: yesterday, archived_at: null, is_published: true },
                { id: '2', title: 'Gelecek', next_review_at: in10Days, archived_at: null, is_published: true }
              ],
              error: null
            })
          };
        }
        if (table === 'article_sources') {
          return {
            select: () => ({
              eq: () => ({
                data: [{ article_id: '1' }],
                error: null
              })
            })
          };
        }
        return {};
      }
    };

    const res1 = await runContentReviewWatch(mockSupabase);
    const res2 = await runContentReviewWatch(mockSupabase);

    expect(res1.counts.expired).toBe(1);
    expect(res1.counts.due30Days).toBe(1);
    expect(res2.counts.expired).toBe(res1.counts.expired);
    expect(res2.counts.due30Days).toBe(res1.counts.due30Days);
    expect(res1.summaryAlerts).toContain('1 içeriğin kontrol süresi geçti');
    expect(res1.summaryAlerts).toContain('1 içerik önümüzdeki 30 gün içinde kontrol edilmeli');
  });

  it('2. Tarihi geçen içerikler kullanıcı görünürlük filtresinde engellenir', () => {
    const expiredArticle = {
      is_published: true,
      archived_at: null,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin',
      source_checked_at: yesterday,
      next_review_at: yesterday
    };

    expect(isArticleEligibleForUser(expiredArticle)).toBe(false);
  });

  it('3. Cron/Watch görevi içeriği veya veritabanını otomatik değiştirmez', async () => {
    let articleMutated = false;
    const mockSupabase: any = {
      from: (table: string) => ({
        select: () => ({
          data: [{ id: '1', title: 'Orijinal Metin', next_review_at: yesterday }],
          eq: () => ({
            data: [],
            error: null
          }),
          error: null
        }),
        update: () => {
          articleMutated = true;
        }
      })
    };

    await runContentReviewWatch(mockSupabase);
    expect(articleMutated).toBe(false);
  });
});
