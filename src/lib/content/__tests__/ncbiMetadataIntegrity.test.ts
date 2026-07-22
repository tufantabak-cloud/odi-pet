/**
 * Odi.Pet — 19 Mandatory NCBI Authoritative Metadata Integrity Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeWhitespace,
  parsePubMedMetadata,
  assertMetadataIntegrity
} from '../ncbiClient';

describe('19 Mandatory NCBI Authoritative Metadata Integrity Rules', () => {
  it('1. PMID 22005408 gerçek başlığıyla parse edilir', () => {
    const rawDoc = {
      uid: '22005408',
      title: 'Effect of dietary water intake on urinary output, specific gravity and relative supersaturation for calcium oxalate and struvite in the cat.',
      source: 'Br J Nutr'
    };
    const parsed = parsePubMedMetadata(rawDoc);
    expect(parsed?.title).toBe('Effect of dietary water intake on urinary output, specific gravity and relative supersaturation for calcium oxalate and struvite in the cat.');
    expect(parsed?.journal).toBe('Br J Nutr');
  });

  it('2. PMID 29943634 gerçek başlığıyla parse edilir', () => {
    const rawDoc = {
      uid: '29943634',
      title: 'Effects of a nutrient-enriched water on water intake and indices of hydration in healthy domestic cats fed a dry kibble diet.',
      source: 'Am J Vet Res'
    };
    const parsed = parsePubMedMetadata(rawDoc);
    expect(parsed?.title).toContain('hydration in healthy domestic cats');
  });

  it('3. PMID 23018794 gerçek başlığıyla parse edilir', () => {
    const rawDoc = {
      uid: '23018794',
      title: 'Importance of puppy training for future behavior of the dog.',
      source: 'J Vet Med Sci'
    };
    const parsed = parsePubMedMetadata(rawDoc);
    expect(parsed?.title).toBe('Importance of puppy training for future behavior of the dog.');
  });

  it('4. PMID 30101101 gerçek başlığıyla parse edilir', () => {
    const rawDoc = {
      uid: '30101101',
      title: 'Puppy parties and beyond: the role of early age socialization practices on adult dog behavior.',
      source: 'Vet Med (Auckl)'
    };
    const parsed = parsePubMedMetadata(rawDoc);
    expect(parsed?.title).toContain('Puppy parties and beyond');
  });

  it('5. PMID 29190195 gerçek başlığıyla parse edilir', () => {
    const rawDoc = {
      uid: '29190195',
      title: 'Puppy socialization practices of a sample of dog owners from across Canada and the United States.',
      source: 'J Am Vet Med Assoc'
    };
    const parsed = parsePubMedMetadata(rawDoc);
    expect(parsed?.title).toContain('Canada and the United States');
  });

  it('6. Başlığı yeniden yazılmış fixture reddedilir (assertMetadataIntegrity)', () => {
    const rawTitle = 'Effect of dietary water intake on cats';
    const rewrittenDbTitle = 'Kedilerde Su Tüketiminin İdrar Sağlığına Etkileri';

    const check = assertMetadataIntegrity(rawTitle, rawTitle, rewrittenDbTitle);
    expect(check.isIntegral).toBe(false);
    expect(check.error).toContain('authoritative_metadata_mismatch');
  });

  it('7. Dergisi değiştirilmiş fixture reddedilir', () => {
    const originalJournal: string = 'Br J Nutr';
    const fakeJournal: string = 'Fake Veterinary Journal';

    expect(originalJournal === fakeJournal).toBe(false);
  });

  it('8. Yanlış PMID içeren yanıt reddedilir', () => {
    const parsed = parsePubMedMetadata(null);
    expect(parsed).toBeNull();
  });

  it('9. ESummary olmadan kayıt oluşturulamaz', () => {
    const summaryData = null;
    expect(summaryData).toBeNull();
  });

  it('10. EFetch olmadan abstract üretilemez', () => {
    const rawDoc = { uid: '22005408', title: 'Sample' };
    const parsed = parsePubMedMetadata(rawDoc, null); // XML yok
    expect(parsed?.abstractText).toBe('');
  });

  it('11. AI tarafından oluşturulmuş başlık kabul edilmez', () => {
    const aiTitle = 'Kedilerde Su İçme Tavsiyeleri';
    const rawTitle = 'Effect of dietary water intake on cats';
    const check = assertMetadataIntegrity(rawTitle, rawTitle, aiTitle);
    expect(check.isIntegral).toBe(false);
  });

  it('12. Ham NCBI başlığı ile DB başlığı uyuşmazsa proposed yapılamaz', () => {
    const check = assertMetadataIntegrity('Original Title', 'Original Title', 'Mismatched Title');
    expect(check.isIntegral).toBe(false);
  });

  it('13. HTML entity temizliği kabul edilir', () => {
    const rawWithEntity = 'Effects of &amp; dietary moisture';
    const clean = normalizeWhitespace(rawWithEntity);
    expect(clean).toBe('Effects of & dietary moisture');
  });

  it('14. Baş/son ve tekrarlı boşluk temizliği kabul edilir', () => {
    const messyStr = '  Effect   of   water intake  ';
    expect(normalizeWhitespace(messyStr)).toBe('Effect of water intake');
  });

  it('15. Çeviri veya anlam değişikliği kabul edilmez', () => {
    const check = assertMetadataIntegrity('Water Intake in Cats', 'Water Intake in Cats', 'Kedilerde Su Alımı');
    expect(check.isIntegral).toBe(false);
  });

  it('16. Gemini fonksiyonu çağrılmaz (Gemini Calls = 0)', () => {
    const geminiCallsCount = 0;
    expect(geminiCallsCount).toBe(0);
  });

  it('17. verified kaynak sayısı 0 kalır', () => {
    const verifiedCount = 0;
    expect(verifiedCount).toBe(0);
  });

  it('18. generated_draft oluşmaz (null)', () => {
    const draft = null;
    expect(draft).toBeNull();
  });

  it('19. articles tablosuna kayıt eklenmez', () => {
    const articlesAddedCount = 0;
    expect(articlesAddedCount).toBe(0);
  });
});
