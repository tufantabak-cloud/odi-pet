/**
 * Odi.Pet — Interaction Security & Idempotency Vitest Suite
 */

import { describe, it, expect } from 'vitest';

// Etkileşim Yetki Kontrolü Simülasyon Yardımcısı
export function authorizeInteraction(
  actingUserId: string,
  petOwnerId: string,
  coOwnerIds: string[] = []
) {
  const isOwner = actingUserId === petOwnerId;
  const isCoOwner = coOwnerIds.includes(actingUserId);
  if (!isOwner && !isCoOwner) {
    return { authorized: false, status: 403, error: 'Bu pet için etkileşim kaydetme yetkiniz yok.' };
  }
  return { authorized: true, status: 200 };
}

// İdempotent Save Simülasyon Yardımcısı
export function processSaveAction(
  savedMap: Map<string, Set<string>>,
  userId: string,
  articleId: string,
  action: 'save' | 'unsave'
) {
  let userSaves = savedMap.get(userId);
  if (!userSaves) {
    userSaves = new Set();
    savedMap.set(userId, userSaves);
  }

  if (action === 'save') {
    userSaves.add(articleId); // Zaten varsa tekrar ekler, silmez (Idempotent)
    return { saved: true };
  } else {
    userSaves.delete(articleId); // Zaten yoksa hata vermez, eklemez (Idempotent)
    return { saved: false };
  }
}

describe('Interaction Security & Idempotency Rules', () => {
  it('1. Yetkisiz pet için shown/viewed istekleri reddedilir (403)', () => {
    const res = authorizeInteraction('hacker-user-id', 'legit-owner-id', ['friend-owner-id']);
    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
  });

  it('2. Pet sahibi ve ortak sahip yetkilendirilir (200)', () => {
    const ownerRes = authorizeInteraction('legit-owner-id', 'legit-owner-id');
    const coOwnerRes = authorizeInteraction('friend-owner-id', 'legit-owner-id', ['friend-owner-id']);

    expect(ownerRes.authorized).toBe(true);
    expect(coOwnerRes.authorized).toBe(true);
  });

  it('3. Save isteğinin 5 kez tekrarlanması kaydı SİLMEZ (Idempotent Save)', () => {
    const savedMap = new Map<string, Set<string>>();
    const userId = 'user-123';
    const articleId = 'art-456';

    // 5 Kez üst üste save çağrısı yapılıyor
    for (let i = 0; i < 5; i++) {
      const res = processSaveAction(savedMap, userId, articleId, 'save');
      expect(res.saved).toBe(true);
    }

    // Kayıt hala var
    expect(savedMap.get(userId)?.has(articleId)).toBe(true);
  });

  it('4. Unsave isteğinin 5 kez tekrarlanması kaydı EKLEMEZ veya HATA VERMEZ (Idempotent Unsave)', () => {
    const savedMap = new Map<string, Set<string>>();
    const userId = 'user-123';
    const articleId = 'art-456';

    // 5 Kez üst üste unsave çağrısı yapılıyor
    for (let i = 0; i < 5; i++) {
      const res = processSaveAction(savedMap, userId, articleId, 'unsave');
      expect(res.saved).toBe(false);
    }

    // Kayıt kesinlikle yok
    expect(savedMap.get(userId)?.has(articleId)).toBe(false);
  });
});
