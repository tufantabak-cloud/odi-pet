/**
 * Odi.Pet — Instagram oEmbed & Safe Fetcher Service (Phase 1)
 * 
 * Kurallar:
 * 1. Yalnızca instagram.com ve www.instagram.com kabul edilir.
 * 2. Profil URL'si tespit edilirse 'unsupported_api' uyarısı döner.
 * 3. Shortcode doğrulanır (/p/code/, /reel/code/, /tv/code/).
 * 4. Safe HTTP Fetcher: Maksimum 3 redirect takip edilir, SSRF & IP engelleri uygulanır (localhost, 127.0.0.1, 10.x, 192.168.x vb. engellenir).
 * 5. Görsel/video Storage'a İNDİRİLMEMELİDİR. Caption kopyalanmamalıdır.
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface InstagramUrlParseResult {
  isValid: boolean;
  isProfileUrl: boolean;
  shortcode?: string;
  mediaType?: 'post' | 'reel' | 'tv';
  normalizedUrl?: string;
  error?: string;
}

export interface InstagramOembedResult {
  status: 'success' | 'unavailable' | 'unsupported_api' | 'invalid_url';
  title?: string;
  authorName?: string;
  authorUrl?: string;
  shortcode?: string;
  permalink?: string;
  htmlEmbed?: string;
  error?: string;
}

/**
 * 1. SSRF & Özel IP Kontrolü
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const norm = hostname.toLowerCase();
  if (
    norm === 'localhost' ||
    norm === '127.0.0.1' ||
    norm === '0.0.0.0' ||
    norm.startsWith('10.') ||
    norm.startsWith('192.168.') ||
    norm.startsWith('172.16.') ||
    norm.endsWith('.local')
  ) {
    return true;
  }
  return false;
}

/**
 * 2. Instagram URL Doğrulama ve İnceleme
 */
export function parseInstagramUrl(urlStr: string): InstagramUrlParseResult {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, isProfileUrl: false, error: 'URL adresi boş veya geçersiz.' };
  }

  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, isProfileUrl: false, error: 'Yalnızca HTTP/HTTPS adresleri kabul edilir.' };
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== 'instagram.com' && host !== 'www.instagram.com') {
      return { isValid: false, isProfileUrl: false, error: 'Yalnızca instagram.com domain adresleri kabul edilir.' };
    }

    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
      return { isValid: false, isProfileUrl: true, error: 'Instagram ana sayfa adresi kabul edilmez.' };
    }

    const firstSeg = pathSegments[0].toLowerCase();

    // Profil URL'si tespiti (örn: /kittenxlady veya /dogmeets_baby)
    if (!['p', 'reel', 'reels', 'tv'].includes(firstSeg)) {
      // Tekil klasör /username formatı
      return {
        isValid: false,
        isProfileUrl: true,
        error: 'Bu hesap şu anda resmî Instagram API ile otomatik takip edilemiyor. Lütfen ilgili gönderi veya Reel bağlantısını ekleyin.'
      };
    }

    // Gönderi / Reel URL'si (/p/CODE/, /reel/CODE/, /tv/CODE/)
    if (pathSegments.length < 2) {
      return { isValid: false, isProfileUrl: false, error: 'Gönderi shortcode bilgisi eksik.' };
    }

    const shortcode = pathSegments[1];
    const mediaType = firstSeg === 'reel' || firstSeg === 'reels' ? 'reel' : firstSeg === 'tv' ? 'tv' : 'post';
    const normalizedUrl = `https://www.instagram.com/${mediaType === 'reel' ? 'reel' : 'p'}/${shortcode}/`;

    return {
      isValid: true,
      isProfileUrl: false,
      shortcode,
      mediaType,
      normalizedUrl
    };
  } catch {
    return { isValid: false, isProfileUrl: false, error: 'URL adresi ayrıştırılamadı.' };
  }
}

/**
 * 3. Güvenli Redirect Takip Eden HTTP Fetcher (Maksimum 3 redirect, SSRF korumalı)
 */
export async function safeFetchWithRedirects(
  targetUrl: string,
  maxRedirects: number = 3
): Promise<{ statusCode: number; finalUrl: string; body: string; error?: string }> {
  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    try {
      const parsed = new URL(currentUrl);
      if (isPrivateOrLocalHost(parsed.hostname)) {
        return { statusCode: 403, finalUrl: currentUrl, body: '', error: 'SSRF Koruması: Özel IP adresine yönlendirme engellendi.' };
      }

      const client = parsed.protocol === 'https:' ? https : http;
      const res = await new Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
        const req = client.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OdiPetBot/1.0' } }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode || 500, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Zaman aşımı (5s)')); });
      });

      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        redirectsCount++;
        const nextUrl = new URL(res.headers.location, currentUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      return { statusCode: res.statusCode, finalUrl: currentUrl, body: res.body };
    } catch (err: any) {
      return { statusCode: 0, finalUrl: currentUrl, body: '', error: err.message };
    }
  }

  return { statusCode: 310, finalUrl: currentUrl, body: '', error: 'Maksimum yönlendirme sınırı (3) aşıldı.' };
}

/**
 * 4. Tokenless Instagram oEmbed Bilgisi Çekme (Sayfa oEmbed & Meta Endpoint)
 */
export async function fetchInstagramOembedInfo(urlStr: string): Promise<InstagramOembedResult> {
  const parseRes = parseInstagramUrl(urlStr);
  if (!parseRes.isValid) {
    if (parseRes.isProfileUrl) {
      return { status: 'unsupported_api', error: parseRes.error };
    }
    return { status: 'invalid_url', error: parseRes.error };
  }

  const permalink = parseRes.normalizedUrl!;
  const oembedApiUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(permalink)}`;

  const fetchRes = await safeFetchWithRedirects(oembedApiUrl, 3);

  if (fetchRes.statusCode === 200 && fetchRes.body) {
    try {
      const data = JSON.parse(fetchRes.body);
      return {
        status: 'success',
        title: data.title || '',
        authorName: data.author_name || '',
        authorUrl: data.author_url || '',
        shortcode: parseRes.shortcode,
        permalink,
        htmlEmbed: data.html || `<blockquote class="instagram-media" data-instgrm-permalink="${permalink}"></blockquote>`
      };
    } catch {
      // JSON parse fail
    }
  }

  // oEmbed sunucu yanıtı vermedi veya auth istedi -> Fallback: unavailable olarak permalink saklanır
  return {
    status: 'unavailable',
    shortcode: parseRes.shortcode,
    permalink,
    htmlEmbed: `<blockquote class="instagram-media" data-instgrm-permalink="${permalink}"></blockquote>`,
    error: `oEmbed verisi çekilemedi (HTTP ${fetchRes.statusCode}). Permalink korundu.`
  };
}
