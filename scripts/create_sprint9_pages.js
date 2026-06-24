const fs = require('fs');
const path = require('path');

const pageContent = (title, table) => `import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: records, error } = await supabase.from('${table}').select('*').limit(5);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">${title}</h1>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      <ul className="space-y-2">
        {records && records.length > 0 ? (
          records.map((record: any) => (
            <li key={record.id} className="p-4 bg-white rounded shadow text-sm">
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </li>
          ))
        ) : (
          <p>Kayıt bulunamadı.</p>
        )}
      </ul>
    </div>
  );
}`;

const pages = {
  // Owner routes
  'src/app/(app)/owner/learn/page.tsx': pageContent('Eğitim İçerikleri', 'articles'),
  'src/app/(app)/owner/learn/[slug]/page.tsx': pageContent('İçerik Detay', 'articles'),
  'src/app/(app)/owner/messages/page.tsx': pageContent('Mesajlar', 'messages'),
  'src/app/(app)/owner/messages/[id]/page.tsx': pageContent('Mesaj Detay', 'messages'),
  'src/app/(app)/owner/budget/page.tsx': pageContent('Bütçe', 'user_subscriptions'),
  'src/app/(app)/owner/events/page.tsx': pageContent('Etkinlikler', 'events'),
  'src/app/(app)/owner/events/[id]/page.tsx': pageContent('Etkinlik Detay', 'events'),
  'src/app/(app)/owner/marketplace/page.tsx': pageContent('Mağaza', 'marketplace_products'),
  'src/app/(app)/owner/bookings/page.tsx': pageContent('Randevular', 'bookings'),
  'src/app/(app)/owner/referral/page.tsx': pageContent('Referanslar', 'referrals'),
  'src/app/(app)/owner/notifications/page.tsx': pageContent('Bildirim Merkezi', 'admin_audit_logs'),
  'src/app/sos/[id]/page.tsx': pageContent('SOS Detay', 'pets'),
  'src/app/sos/[id]/matches/page.tsx': pageContent('SOS Eşleşmeleri', 'pets'),

  // Business Dashboards
  'src/app/(app)/clinic/dashboard/page.tsx': pageContent('Klinik Dashboard', 'business_profiles'),
  'src/app/(app)/clinic/patients/page.tsx': pageContent('Hastalar', 'pets'),
  'src/app/(app)/clinic/patient/[petId]/page.tsx': pageContent('Hasta Detay', 'pets'),
  'src/app/(app)/hotel/dashboard/page.tsx': pageContent('Otel Dashboard', 'business_profiles'),
  'src/app/(app)/groomer/dashboard/page.tsx': pageContent('Kuaför Dashboard', 'business_profiles'),
  'src/app/(app)/sitter/dashboard/page.tsx': pageContent('Bakıcı Dashboard', 'business_profiles'),
  'src/app/(app)/trainer/dashboard/page.tsx': pageContent('Eğitmen Dashboard', 'business_profiles'),
  'src/app/register/business/page.tsx': pageContent('İşletme Kayıt', 'business_profiles'),

  // Admin Pages
  'src/app/admin/plans/page.tsx': pageContent('Abonelik Planları', 'subscription_plans'),
  'src/app/admin/limits/page.tsx': pageContent('Onboarding Limitleri', 'onboarding_limits'),
  'src/app/admin/onboarding/page.tsx': pageContent('Onboarding Durumları', 'user_activation_scores'),
  'src/app/admin/businesses/page.tsx': pageContent('İşletmeler', 'business_profiles'),
  'src/app/admin/revenue/page.tsx': pageContent('Gelir Durumu', 'user_subscriptions'),
  'src/app/admin/health/page.tsx': pageContent('Sistem Sağlığı', 'admin_audit_logs'),
  'src/app/admin/bookings/page.tsx': pageContent('Tüm Randevular', 'bookings'),
  'src/app/admin/content/page.tsx': pageContent('İçerik Yönetimi', 'articles'),
  'src/app/admin/audit-logs/page.tsx': pageContent('Audit Logları', 'admin_audit_logs'),
};

Object.entries(pages).forEach(([filePath, content]) => {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log('Created: ' + filePath);
  } else {
    console.log('Skipped (already exists): ' + filePath);
  }
});
