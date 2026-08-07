import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  Gift,
  Users
} from 'lucide-react';
import MembershipsManagementClient from './MembershipsManagementClient';

export default async function AdminMembershipsPage() {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
    redirect('/owner/dashboard');
  }

  const adminSupabase = createAdminSupabaseClient();
  const now = new Date();
  const nowISO = now.toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString();
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString();

  // 1. Özet Metrikler & Phase 18 Üyelik Verileri (Read-Only Aggregation - OPOS Cilt 5/6)
  const [
    { count: totalActivePremium },
    { count: totalPaidSubs },
    { data: monthCredits },
    { data: riskUsers },
    { data: reasonGroups },
    { data: referralsStats },
    { data: allPlans },
    { data: allBundles },
    { data: allPlanBundles },
    { data: allBundleFeatures }
  ] = await Promise.all([
    adminSupabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).in('status', ['active', 'trialing']).in('plan', ['pro', 'ai_plus']),
    adminSupabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).in('status', ['active', 'trialing']).in('plan', ['pro', 'ai_plus']),
    adminSupabase.from('membership_credits').select('credit_days').gte('created_at', startOfMonth),
    adminSupabase.from('user_subscriptions').select('id, profile_id, plan, pro_until').gt('pro_until', nowISO).lte('pro_until', in30Days).order('pro_until', { ascending: true }).limit(50),
    adminSupabase.from('membership_credits').select('reason, credit_days'),
    adminSupabase.from('referrals').select('status'),
    adminSupabase.from('subscription_plans').select('*').order('sort_order', { ascending: true }),
    adminSupabase.from('app_bundles').select('*'),
    adminSupabase.from('plan_bundles').select('*'),
    adminSupabase.from('bundle_features').select('*')
  ]);

  // Fetch all profiles (only real columns) and user_subscriptions separately
  const { data: allProfiles } = await adminSupabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: allUserSubs } = await adminSupabase
    .from('user_subscriptions')
    .select('*')
    .limit(200);

  console.log('[memberships] profiles:', allProfiles?.length ?? 0, 'subs:', allUserSubs?.length ?? 0);

  const totalMonthDaysGranted = monthCredits?.reduce((acc, curr) => acc + (curr.credit_days || 0), 0) ?? 0;

  // Churn risk kırılımları (pro_until from user_subscriptions)
  const risk7Days = riskUsers?.filter((u: any) => u.pro_until && u.pro_until <= in7Days) ?? [];
  const creditOnlyCount = Math.max(0, (totalActivePremium ?? 0) - (totalPaidSubs ?? 0));

  // Reason dağılımı
  const reasonSummary: Record<string, { count: number; totalDays: number }> = {};
  reasonGroups?.forEach((row) => {
    if (!reasonSummary[row.reason]) {
      reasonSummary[row.reason] = { count: 0, totalDays: 0 };
    }
    reasonSummary[row.reason].count += 1;
    reasonSummary[row.reason].totalDays += row.credit_days || 0;
  });

  // Davet hunisi
  const totalInvites = referralsStats?.length ?? 0;
  const qualifiedInvites = referralsStats?.filter((r) => r.status === 'qualified').length ?? 0;
  const conversionRate = totalInvites > 0 ? Math.round((qualifiedInvites / totalInvites) * 100) : 0;

  // In-memory mapping of user_subscriptions to profiles
  const subMap = new Map((allUserSubs || []).map((s: any) => [s.profile_id, s]));

  // Formatted Subscriptions for Phase 18 Layer (All Registered Profiles)
  const formattedSubscriptions = (allProfiles || []).map((prof: any) => {
    const sub = subMap.get(prof.id) || {};

    const aiPlusUntil = sub.ai_plus_until;
    const proUntil = sub.pro_until;

    const aiPlusEnd = aiPlusUntil ? new Date(aiPlusUntil) : null;
    const proEnd = proUntil ? new Date(proUntil) : null;

    const daysLeftAiPlus = aiPlusEnd && aiPlusEnd > now ? Math.ceil((aiPlusEnd.getTime() - now.getTime()) / 86400000) : 0;
    const proBaseDate = aiPlusEnd && aiPlusEnd > now ? aiPlusEnd : now;
    const daysLeftPro = proEnd && proEnd > proBaseDate ? Math.ceil((proEnd.getTime() - proBaseDate.getTime()) / 86400000) : 0;
    const totalPremiumDays = proEnd && proEnd > now ? Math.ceil((proEnd.getTime() - now.getTime()) / 86400000) : 0;

    let computedPlan = sub.plan || prof.premium_tier || 'free';
    if (daysLeftAiPlus > 0) computedPlan = 'ai_plus';
    else if (daysLeftPro > 0) computedPlan = 'pro';

    return {
      id: sub.id || prof.id,
      profile_id: prof.id,
      profiles: {
        first_name: prof.first_name,
        last_name: prof.last_name,
        email: prof.email,
        role: prof.role,
      },
      plan: computedPlan,
      status: sub.status || (totalPremiumDays > 0 ? 'active' : 'free'),
      provider: sub.provider || 'referral',
      daysLeftAiPlus,
      daysLeftPro,
      totalPremiumDays,
      premiumEndDate: proUntil || sub.current_period_end
    };
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs font-bold text-slate-500 hover:text-slate-900">
              ← Yönetici Paneline Dön
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Üyelik İzleme & Promosyon Yönetimi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            OPOS Cilt 14 RBAC & Dinamik Kredi Gün Ayarları, Promosyon Gönderimi & Phase 18 Üyelik Provider Katmanı
          </p>
        </div>
      </div>

      {/* 1. Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aktif Premium Kullanıcı</span>
          <span className="text-3xl font-black text-slate-900">{totalActivePremium ?? 0}</span>
          <span className="text-xs text-slate-500">
            {totalPaidSubs ?? 0} Ödemeli • {creditOnlyCount} Kredili
          </span>
        </div>

        <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bu Ay Verilen Kredi</span>
          <span className="text-3xl font-black text-amber-500">+{totalMonthDaysGranted} Gün</span>
          <span className="text-xs text-slate-500">{monthCredits?.length ?? 0} Toplam işlem</span>
        </div>

        <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">7 Günlük Risk Grubu</span>
          <span className="text-3xl font-black text-rose-600">{risk7Days.length} Kullanıcı</span>
          <span className="text-xs text-rose-500 font-semibold">Süresi dolmak üzere</span>
        </div>

        <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Davet Dönüşüm Oranı</span>
          <span className="text-3xl font-black text-emerald-600">%{conversionRate}</span>
          <span className="text-xs text-slate-500">{qualifiedInvites} / {totalInvites} Nitelikli</span>
        </div>
      </div>

      {/* 2. Dinamik Yönetim, Promosyon Gönderme Aracı & Phase 18 Üyelik Provider Paneli */}
      <MembershipsManagementClient
        riskUsers={[]}
        initialSubscriptions={formattedSubscriptions}
        initialPlans={allPlans ?? []}
        initialBundles={allBundles ?? []}
        initialPlanBundles={allPlanBundles ?? []}
        initialBundleFeatures={allBundleFeatures ?? []}
      />

      {/* 3. Churn Riski Listesi (Expiring Soon) */}
      <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Churn Riski Taşıyan Kullanıcılar (Son 30 Gün)
          </h2>
          <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
            {riskUsers?.length ?? 0} Kullanıcı Eşleşti
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">Kullanıcı</th>
                <th className="p-3">Kademe</th>
                <th className="p-3">Bitiş Tarihi</th>
                <th className="p-3">Kalan Gün</th>
                <th className="p-3 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riskUsers?.map((user: any) => {
                const until = new Date(user.pro_until ?? now);
                const daysLeft = Math.ceil((until.getTime() - now.getTime()) / 86400000);
                const isUrgent = daysLeft <= 7;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      Kullanıcı ({user.profile_id?.slice(0, 8)}...)
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-2xs font-bold uppercase">
                        {user.plan || 'pro'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {until.toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isUrgent ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {daysLeft} gün kaldı
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/users/${user.profile_id}`}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!riskUsers || riskUsers.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 text-sm">
                    Önümüzdeki 30 gün içinde süresi bitecek riskli kullanıcı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Kredi Kaynak Dağılımı */}
      <div className="card-base p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Kredi Kaynağı Dağılımı
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(reasonSummary).map(([reason, stats]) => (
            <div key={reason} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-sm font-bold text-slate-900 uppercase">{reason}</span>
                <p className="text-xs text-slate-500">{stats.count} işlem</p>
              </div>
              <span className="text-sm font-extrabold text-primary">+{stats.totalDays} Gün</span>
            </div>
          ))}
          {Object.keys(reasonSummary).length === 0 && (
            <p className="text-sm text-slate-400 text-center col-span-full py-4">Henüz kayıtlı kredi işlemi bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
}
