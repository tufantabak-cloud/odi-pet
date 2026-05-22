/**
 * Diagnostic Script to fetch Supabase Auth Audit Logs
 */

const SUPABASE_URL = 'https://soautcxgiqhxiaxrubxv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXV0Y3hnaXFoeGlheHJ1Ynh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY3MDUxOCwiZXhwIjoyMDkyMjQ2NTE4fQ.NLqRvY4_Q1O7Ua1qrqsvDZVaoexT4HQ8oKAgY7XdPKE';

async function main() {
  console.log('🔍 Supabase Auth Audit Logs Kontrolü');
  console.log('='.repeat(60));

  try {
    // Try to query the audit logs
    const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_log_entries?order=created_at.desc&limit=10`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Son 10 Audit Log:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ audit_log_entries tablosuna erişilemedi (Status: ${res.status}). REST API'ye açık olmayabilir.`);
    }
  } catch (e) {
    console.error('Hata:', e.message);
  }
}

main().catch(console.error);
