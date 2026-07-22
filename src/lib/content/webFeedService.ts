/**
 * Odi.Pet — Web & RSS/Atom Feed Service (Phase 1)
 * 
 * Kurallar:
 * 1. RSS/Atom akışları ve whitelist web sayfaları güvenli biçimde işlenir.
 * 2. SSRF ve Özel IP engeli (localhost, 127.0.0.1, 10.x, 192.168.x vb.) kesinlikle uygulanır.
 * 3. javascript:, data:, file: URL'leri engellenir.
 * 4. Yalnızca HTTPS kabul edilir.
 * 5. Her içerik için canonical URL, başlık, yayıncı, yayın tarihi ve content_hash saklanır.
 */

import crypto from 'crypto';
import { safeFetchWithRedirects, isPrivateOrLocalHost } from './instagramOembedService.js';

export interface FeedItem {
  guid: string;
  title: string;
  link: string;
  canonicalUrl: string;
  publisher: string;
  publishedAt?: string;
  contentHash: string;
  summary?: string;
}

export interface WebPageItem {
  title: string;
  canonicalUrl: string;
  publisher: string;
  publishedAt?: string;
  contentHash: string;
  summary?: string;
}

/**
 * 1. Content Hash Üretici
 */
export function generateContentHash(title: string, link: string): string {
  const norm = `${title.trim().toLowerCase()}_${link.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(norm).digest('hex');
}

/**
 * 2. Web URL Güvenlik Kontrolü
 */
export function validateWebUrl(urlStr: string): { isValid: boolean; error?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, error: 'URL adresi boş.' };
  }

  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Yalnızca https:// protokolü desteklenir.' };
    }

    if (isPrivateOrLocalHost(parsed.hostname)) {
      return { isValid: false, error: 'SSRF Koruması: Dahili ağ veya özel IP adresleri engellendi.' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Geçersiz URL formatı.' };
  }
}

/**
 * 3. Basit RSS/Atom XML Ayrıştırıcı
 */
export function parseRssXml(xmlText: string, feedUrl: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemMatches = xmlText.match(/<(item|entry)[\s\S]*?<\/\1>/gi) || [];

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>|<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const guidMatch = itemXml.match(/<(guid|id)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i);
    const pubDateMatch = itemXml.match(/<(pubDate|published|updated)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i);
    const descMatch = itemXml.match(/<(description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i);

    const title = titleMatch ? titleMatch[1].trim().replace(/<[^>]+>/g, '') : '';
    const rawLink = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '';
    const guid = guidMatch ? guidMatch[2].trim() : rawLink || title;
    const pubDate = pubDateMatch ? pubDateMatch[2].trim() : undefined;
    const summary = descMatch ? descMatch[2].trim().replace(/<[^>]+>/g, '').substring(0, 300) : '';

    if (title && rawLink) {
      const hash = generateContentHash(title, rawLink);
      let publisher = 'RSS Feed';
      try { publisher = new URL(feedUrl).hostname; } catch {}

      items.push({
        guid,
        title,
        link: rawLink,
        canonicalUrl: rawLink,
        publisher,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        contentHash: hash,
        summary
      });
    }
  }

  return items;
}

/**
 * 4. RSS / Atom Feed Fetcher
 */
export async function fetchFeedContent(feedUrl: string): Promise<{ items: FeedItem[]; error?: string }> {
  const val = validateWebUrl(feedUrl);
  if (!val.isValid) return { items: [], error: val.error };

  const res = await safeFetchWithRedirects(feedUrl, 3);
  if (res.statusCode !== 200 || !res.body) {
    return { items: [], error: `Feed erişimi başarısız (HTTP ${res.statusCode}): ${res.error || 'Boş yanıt'}` };
  }

  const items = parseRssXml(res.body, feedUrl);
  return { items };
}

/**
 * 5. Tekil Web Sayfası Metadata Fetcher
 */
export async function fetchWebPageInfo(webUrl: string): Promise<{ item?: WebPageItem; error?: string }> {
  const val = validateWebUrl(webUrl);
  if (!val.isValid) return { error: val.error };

  const res = await safeFetchWithRedirects(webUrl, 3);
  if (res.statusCode !== 200 || !res.body) {
    return { error: `Web sayfası erişimi başarısız (HTTP ${res.statusCode}): ${res.error || 'Boş yanıt'}` };
  }

  const html = res.body;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

  const title = titleMatch ? titleMatch[1].trim().replace(/<[^>]+>/g, '') : 'Web Sayfası İçeriği';
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : res.finalUrl;
  const summary = descMatch ? descMatch[1].trim() : '';

  let publisher = 'Web Kaynağı';
  try { publisher = new URL(canonicalUrl).hostname; } catch {}

  const hash = generateContentHash(title, canonicalUrl);

  return {
    item: {
      title,
      canonicalUrl,
      publisher,
      publishedAt: new Date().toISOString(),
      contentHash: hash,
      summary
    }
  };
}
