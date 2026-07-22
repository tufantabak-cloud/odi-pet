/**
 * Odi.Pet — Authoritative Single NCBI Client Module
 * NCBI ESearch, ESummary & EFetch API Entegrasyonu ve Metadata Bütünlük Denetimi
 * 
 * Kurallar:
 * 1. PubMed başlık, dergi, yazar ve abstract bilgileri YALNIZCA ham NCBI API yanıtından alınır.
 * 2. AI başlık uyduramaz, özetleyemez, çeviremez veya yeniden yazamaz!
 * 3. assertMetadataIntegrity: rawTitle === parsedTitle === dbTitle (Normalize boşluk hariç) birebir eşit olmalıdır.
 */

export interface AuthoritativeNcbiMetadata {
  pmid: string;
  title: string;
  journal: string;
  pubdate: string;
  authors: string[];
  abstractText?: string;
  doi?: string;
  canonicalUrl: string;
  rawSummaryDoc?: any;
}

/**
 * Boşluk ve HTML Entity Temizleme
 */
export function normalizeWhitespace(str: string): string {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 1. searchPubMed (esearch.fcgi)
 */
export async function searchPubMed(query: string): Promise<string[]> {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=5`;
    const res = await fetch(url, { headers: { 'User-Agent': 'OdiPetAuthoritativeNcbiClient/1.0' } });
    if (!res.ok) return [];

    const data = await res.json();
    return data?.esearchresult?.idlist || [];
  } catch {
    return [];
  }
}

/**
 * 2. fetchPubMedSummary (esummary.fcgi)
 */
export async function fetchPubMedSummary(pmid: string): Promise<any | null> {
  if (!pmid || !/^\d{6,10}$/.test(pmid)) return null;

  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'OdiPetAuthoritativeNcbiClient/1.0' } });
    if (!res.ok) return null;

    const data = await res.json();
    return data?.result?.[pmid] || null;
  } catch {
    return null;
  }
}

/**
 * 3. fetchPubMedRecord (efetch.fcgi)
 */
export async function fetchPubMedRecord(pmid: string): Promise<string | null> {
  if (!pmid || !/^\d{6,10}$/.test(pmid)) return null;

  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
    const res = await fetch(url, { headers: { 'User-Agent': 'OdiPetAuthoritativeNcbiClient/1.0' } });
    if (!res.ok) return null;

    return await res.text();
  } catch {
    return null;
  }
}

/**
 * 4. parsePubMedMetadata
 * ESummary ve EFetch ham yanıtlarını hiçbir metinsel değişiklik yapmadan parse eder.
 */
export function parsePubMedMetadata(rawSummaryDoc: any, rawFetchXml?: string | null): AuthoritativeNcbiMetadata | null {
  if (!rawSummaryDoc || !rawSummaryDoc.uid) return null;

  const rawTitle = rawSummaryDoc.title || '';
  const parsedTitle = normalizeWhitespace(rawTitle);

  const pmid = String(rawSummaryDoc.uid);
  const journal = normalizeWhitespace(rawSummaryDoc.source || 'PubMed');
  const pubdate = rawSummaryDoc.pubdate || '';
  const authors = (rawSummaryDoc.authors || []).map((a: any) => a.name).filter(Boolean);
  const doi = rawSummaryDoc.articleids?.find((id: any) => id.idtype === 'doi')?.value;

  // EFetch XML'den Abstract Ayıklama
  let abstractText = '';
  if (rawFetchXml) {
    const absMatch = rawFetchXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/i);
    if (absMatch && absMatch[1]) {
      abstractText = normalizeWhitespace(absMatch[1]);
    }
  }

  return {
    pmid,
    title: parsedTitle,
    journal,
    pubdate,
    authors,
    abstractText,
    doi,
    canonicalUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    rawSummaryDoc
  };
}

/**
 * 5. assertMetadataIntegrity
 * Ham NCBI başlığı, Parse edilmiş başlık ve DB başlığının BIREBIR eşitliğini doğrular.
 */
export function assertMetadataIntegrity(
  rawTitle: string,
  parsedTitle: string,
  dbTitle: string
): { isIntegral: boolean; error?: string } {
  const normRaw = normalizeWhitespace(rawTitle);
  const normParsed = normalizeWhitespace(parsedTitle);
  const normDb = normalizeWhitespace(dbTitle);

  if (normRaw !== normParsed) {
    return {
      isIntegral: false,
      error: `raw_ncbi_title ("${normRaw}") parsed_title ("${normParsed}") ile eşleşmiyor.`
    };
  }

  if (normParsed !== normDb) {
    return {
      isIntegral: false,
      error: `parsed_title ("${normParsed}") db_title ("${normDb}") ile birebir eşleşmiyor (authoritative_metadata_mismatch).`
    };
  }

  return { isIntegral: true };
}
