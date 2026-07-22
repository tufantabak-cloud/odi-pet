import { describe, it, expect } from 'vitest';
import { parseInstagramUrl } from '../instagramOembedService';
import { generateContentHash, validateWebUrl } from '../webFeedService';
import { classifyDiscoveredContent } from '../sourceContentClassifier';

describe('Monitored Sources & Draft Generation (Phase 1)', () => {
  it('should block profile URLs with unsupported_api message', () => {
    const res = parseInstagramUrl('https://www.instagram.com/kittenxlady/');
    expect(res.isProfileUrl).toBe(true);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('otomatik takip edilemiyor');
  });

  it('should correctly parse single Instagram post URLs', () => {
    const res = parseInstagramUrl('https://www.instagram.com/p/C0123456789/');
    expect(res.isValid).toBe(true);
    expect(res.shortcode).toBe('C0123456789');
    expect(res.mediaType).toBe('post');
  });

  it('should block non-instagram domain URLs', () => {
    const res = parseInstagramUrl('https://www.facebook.com/p/123/');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('instagram.com');
  });

  it('should generate consistent SHA256 content hashes', () => {
    const h1 = generateContentHash('Kedi Su Tüketimi', 'https://example.com/cat-water');
    const h2 = generateContentHash('Kedi Su Tüketimi', 'https://example.com/cat-water');
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });

  it('should enforce SSRF protection on local IP addresses', () => {
    const v1 = validateWebUrl('https://localhost/admin');
    const v2 = validateWebUrl('https://192.168.1.1/config');
    const v3 = validateWebUrl('https://example.com/feed.xml');

    expect(v1.isValid).toBe(false);
    expect(v2.isValid).toBe(false);
    expect(v3.isValid).toBe(true);
  });

  it('should reject commercial/ad content and miracle cure claims', () => {
    const adRes = classifyDiscoveredContent('Kedi Mamasında %50 İndirim Fırsatı', 'Sipariş verin');
    const cureRes = classifyDiscoveredContent('Kanserli Kediler İçin Kesin Tedavi Eden Mucize İlaç', 'Dozunda verin');
    const validRes = classifyDiscoveredContent('Yavru Kedilerde Tırmalama Eğitimi', 'Kedi tırmalama tahtası kullanımı');

    expect(adRes.isEligible).toBe(false);
    expect(cureRes.isEligible).toBe(false);
    expect(validRes.isEligible).toBe(true);
    expect(validRes.speciesScope).toBe('cat');
    expect(validRes.category).toBe('egitim');
  });
});
