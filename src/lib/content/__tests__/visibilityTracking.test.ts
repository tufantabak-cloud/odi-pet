/**
 * Odi.Pet — Visibility Tracking (IntersectionObserver Dwell Time) Vitest Suite
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Görünürlük Takibi Mantık Simülasyonu
export class VisibilityTracker {
  private trackedKeys = new Set<string>();
  private activeTimer: any = null;

  public onVisibilityChange({
    activePetId,
    articleId,
    isIntersecting,
    intersectionRatio,
    onShown
  }: {
    activePetId: string;
    articleId: string;
    isIntersecting: boolean;
    intersectionRatio: number;
    onShown: () => void;
  }) {
    const key = `${activePetId}:${articleId}`;
    if (this.trackedKeys.has(key)) return;

    if (isIntersecting && intersectionRatio >= 0.5) {
      if (!this.activeTimer) {
        this.activeTimer = setTimeout(() => {
          if (!this.trackedKeys.has(key)) {
            this.trackedKeys.add(key);
            onShown();
          }
          this.activeTimer = null;
        }, 800);
      }
    } else {
      if (this.activeTimer) {
        clearTimeout(this.activeTimer);
        this.activeTimer = null;
      }
    }
  }

  public resetPet(petId: string) {
    // Pet değiştiğinde veya oturum sıfırlandığında
    this.trackedKeys.clear();
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }

  public isTracked(petId: string, articleId: string) {
    return this.trackedKeys.has(`${petId}:${articleId}`);
  }
}

describe('Visibility Tracking & Dwell-Time Rules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Render edilen fakat %50 görünür olmayan kart shown göndermez', () => {
    const tracker = new VisibilityTracker();
    const mockOnShown = vi.fn();

    // %30 görünürlük (Eşik %50)
    tracker.onVisibilityChange({
      activePetId: 'pet-1',
      articleId: 'art-1',
      isIntersecting: true,
      intersectionRatio: 0.3,
      onShown: mockOnShown
    });

    vi.advanceTimersByTime(1000);
    expect(mockOnShown).not.toHaveBeenCalled();
    expect(tracker.isTracked('pet-1', 'art-1')).toBe(false);
  });

  it('2. En az %50 ve 800ms kesintisiz görünür kalan kart shown gönderir', () => {
    const tracker = new VisibilityTracker();
    const mockOnShown = vi.fn();

    // %60 görünürlük
    tracker.onVisibilityChange({
      activePetId: 'pet-1',
      articleId: 'art-1',
      isIntersecting: true,
      intersectionRatio: 0.6,
      onShown: mockOnShown
    });

    // 500ms sonra henüz gönderilmedi
    vi.advanceTimersByTime(500);
    expect(mockOnShown).not.toHaveBeenCalled();

    // 800ms dolunca gönderildi
    vi.advanceTimersByTime(350);
    expect(mockOnShown).toHaveBeenCalledTimes(1);
    expect(tracker.isTracked('pet-1', 'art-1')).toBe(true);
  });

  it('3. 800ms dolmadan kart ekrandan çıkarsa zamanlayıcı iptal olur ve shown gönderilmez', () => {
    const tracker = new VisibilityTracker();
    const mockOnShown = vi.fn();

    // %80 görünürlük başladı
    tracker.onVisibilityChange({
      activePetId: 'pet-1',
      articleId: 'art-1',
      isIntersecting: true,
      intersectionRatio: 0.8,
      onShown: mockOnShown
    });

    vi.advanceTimersByTime(400);

    // 400ms sonra kullanıcı hızlıca kaydırdı (%10 görünürlük)
    tracker.onVisibilityChange({
      activePetId: 'pet-1',
      articleId: 'art-1',
      isIntersecting: false,
      intersectionRatio: 0.1,
      onShown: mockOnShown
    });

    vi.advanceTimersByTime(1000);
    expect(mockOnShown).not.toHaveBeenCalled();
    expect(tracker.isTracked('pet-1', 'art-1')).toBe(false);
  });

  it('4. Tekrar görünür olduğunda aynı oturumda ikinci kez shown gönderilmez', () => {
    const tracker = new VisibilityTracker();
    const mockOnShown = vi.fn();

    // İlk başarılı gösterim
    tracker.onVisibilityChange({
      activePetId: 'pet-1',
      articleId: 'art-1',
      isIntersecting: true,
      intersectionRatio: 1.0,
      onShown: mockOnShown
    });
    vi.advanceTimersByTime(850);
    expect(mockOnShown).toHaveBeenCalledTimes(1);

    // Tekrar ekrandan çıkıp tekrar görünür olması
    tracker.onVisibilityChange({
      activePetId: 'pet-1',
      articleId: 'art-1',
      isIntersecting: true,
      intersectionRatio: 1.0,
      onShown: mockOnShown
    });
    vi.advanceTimersByTime(1000);

    expect(mockOnShown).toHaveBeenCalledTimes(1); // Hala sadece 1 kez çağrıldı
  });

  it('5. Aktif pet değiştiğinde yeni içerik için tekrar gönderim yapılabilir', () => {
    const tracker = new VisibilityTracker();
    const mockOnShownPet1 = vi.fn();
    const mockOnShownPet2 = vi.fn();

    // Pet 1 gösterim
    tracker.onVisibilityChange({
      activePetId: 'pet-1',
      articleId: 'art-1',
      isIntersecting: true,
      intersectionRatio: 0.9,
      onShown: mockOnShownPet1
    });
    vi.advanceTimersByTime(850);
    expect(mockOnShownPet1).toHaveBeenCalledTimes(1);

    // Pet 2'ye geçiş ve reset
    tracker.resetPet('pet-2');

    // Pet 2 için aynı veya farklı makale gösterimi
    tracker.onVisibilityChange({
      activePetId: 'pet-2',
      articleId: 'art-1',
      isIntersecting: true,
      intersectionRatio: 0.9,
      onShown: mockOnShownPet2
    });
    vi.advanceTimersByTime(850);
    expect(mockOnShownPet2).toHaveBeenCalledTimes(1);
  });
});
