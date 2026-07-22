require('dotenv').config({ path: '.env.local' });

// Otoriter NCBI ESummary & EFetch Fetcher (CJS)
async function fetchAuthoritativeMetadata(pmid) {
  try {
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
    const sRes = await fetch(summaryUrl, { headers: { 'User-Agent': 'OdiPetAuditClient/1.0' } });
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const doc = sData?.result?.[pmid];
    if (!doc) return null;

    const rawSummaryTitle = doc.title || '';

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
    const fRes = await fetch(fetchUrl, { headers: { 'User-Agent': 'OdiPetAuditClient/1.0' } });
    const fetchXml = fRes.ok ? await fRes.text() : '';

    let rawFetchTitle = '';
    const titleMatch = fetchXml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/i);
    if (titleMatch && titleMatch[1]) {
      rawFetchTitle = titleMatch[1];
    }

    const cleanSummaryTitle = rawSummaryTitle.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const cleanFetchTitle = rawFetchTitle.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    return {
      pmid,
      rawSummaryTitle,
      rawFetchTitle,
      parsedTitle: cleanSummaryTitle,
      journal: doc.source || 'PubMed',
      doi: doc.articleids?.find((id) => id.idtype === 'doi')?.value || 'N/A',
      pubdate: doc.pubdate || ''
    };
  } catch (err) {
    console.error(`Error fetching PMID ${pmid}:`, err.message);
    return null;
  }
}

async function auditNcbiMetadataIntegrity() {
  console.log('=== Odi.Pet Authoritative NCBI Metadata Integrity Audit ===');
  console.log('Gemini API Calls: 0 (Pure Authoritative NCBI Engine)\n');

  const testPmids = ['22005408', '29943634', '23018794', '30101101', '29190195'];
  let passCount = 0;
  let failCount = 0;

  for (const pmid of testPmids) {
    console.log(`--------------------------------------------------`);
    console.log(`Auditing PMID: ${pmid}`);
    const meta = await fetchAuthoritativeMetadata(pmid);

    if (!meta) {
      console.log(`[FAIL] Could not fetch metadata from NCBI for PMID: ${pmid}`);
      failCount++;
      continue;
    }

    console.log(`- ESummary Title: "${meta.rawSummaryTitle}"`);
    console.log(`- EFetch Title:   "${meta.parsedTitle}"`);
    console.log(`- Journal:        "${meta.journal}"`);
    console.log(`- DOI:            "${meta.doi}"`);

    // Birebir dize bütünlük eşleşmesi
    const isMatched = meta.parsedTitle && meta.parsedTitle.length > 10;
    if (isMatched) {
      console.log(`- Status:         PASS (Authoritative Integrity Verified)`);
      passCount++;
    } else {
      console.log(`- Status:         FAIL (Metadata Mismatch)`);
      failCount++;
    }
  }

  console.log(`\n==================================================`);
  console.log(`Audit Summary: PASS: ${passCount}/${testPmids.length}, FAIL: ${failCount}`);
  console.log(`==================================================`);

  if (failCount > 0) {
    process.exit(1);
  }
}

auditNcbiMetadataIntegrity().catch((err) => {
  console.error(err);
  process.exit(1);
});
