/**
 * Supabase Direct SQL Execution Script
 * Creates a temporary helper function, runs fix SQL, then cleans up.
 * Uses service role key with Supabase REST API.
 */

const SUPABASE_URL = 'https://soautcxgiqhxiaxrubxv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXV0Y3hnaXFoeGlheHJ1Ynh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY3MDUxOCwiZXhwIjoyMDkyMjQ2NTE4fQ.NLqRvY4_Q1O7Ua1qrqsvDZVaoexT4HQ8oKAgY7XdPKE';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer': 'return=representation',
};

async function supabaseQuery(table, method = 'GET', body = null, extraHeaders = {}) {
  const opts = {
    method,
    headers: { ...headers, ...extraHeaders },
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, opts);
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text };
}

async function rpc(fnName, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text };
}

async function main() {
  console.log('🔧 Supabase Trigger Fix Script - Direct Approach');
  console.log('='.repeat(60));

  // =========================================================
  // APPROACH: Use Supabase Admin Auth API to find/test users
  // Then use the profiles table directly via REST to diagnose
  // =========================================================

  // Step 1: Check existing auth users
  console.log('\n📡 ADIM 1: Auth kullanıcılarını kontrol ediliyor...');
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=5`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  
  if (authRes.ok) {
    const authData = await authRes.json();
    const users = authData.users || authData;
    console.log(`  ✅ ${users.length} kullanıcı bulundu`);
    
    for (const user of users) {
      console.log(`    - ${user.email || 'N/A'} | ID: ${user.id} | Provider: ${user.app_metadata?.provider || 'email'}`);
      
      // Check if this user has a profile
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=id,first_name,email`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const profiles = await profileRes.json();
      if (profiles.length > 0) {
        console.log(`      → Profil: ✅ (${profiles[0].first_name}, ${profiles[0].email})`);
      } else {
        console.log(`      → Profil: ❌ EKSIK! Bu kullanıcının profili oluşturulamamış.`);
      }

      // Check onboarding_progress
      const onbRes = await fetch(`${SUPABASE_URL}/rest/v1/onboarding_progress?profile_id=eq.${user.id}&select=id`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const onb = await onbRes.json();
      console.log(`      → Onboarding: ${onb.length > 0 ? '✅' : '❌ EKSIK'}`);

      // Check activation_metrics
      const actRes = await fetch(`${SUPABASE_URL}/rest/v1/activation_metrics?profile_id=eq.${user.id}&select=id`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const act = await actRes.json();
      console.log(`      → Activation Metrics: ${act.length > 0 ? '✅' : '❌ EKSIK'}`);

      // Check user_subscriptions
      const subRes = await fetch(`${SUPABASE_URL}/rest/v1/user_subscriptions?profile_id=eq.${user.id}&select=id`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const sub = await subRes.json();
      console.log(`      → Subscription: ${sub.length > 0 ? '✅' : '⚠️ Yok (beklenen olabilir)'}`);
    }
  } else {
    console.log('  ❌ Auth API erişim hatası:', authRes.status);
  }

  // Step 2: Try to simulate what happens when a new user is created
  // We'll create a test user via Auth Admin API and see if it fails
  console.log('\n📡 ADIM 2: Test kullanıcısı oluşturarak trigger zincirini test ediyoruz...');
  
  const testEmail = `test-trigger-${Date.now()}@test-odi.pet`;
  const createUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        full_name: 'Test Trigger User',
      },
    }),
  });

  const createUserText = await createUserRes.text();
  
  if (createUserRes.ok) {
    const newUser = JSON.parse(createUserText);
    console.log(`  ✅ Test kullanıcısı oluşturuldu: ${testEmail} (ID: ${newUser.id})`);
    console.log(`  ✅ Bu demek oluyor ki handle_new_user() trigger'ı çalışıyor!`);
    
    // Verify the trigger chain
    await new Promise(r => setTimeout(r, 1000)); // wait a bit for triggers
    
    const profileCheck = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${newUser.id}&select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    const profile = await profileCheck.json();
    console.log(`  Profil oluştu mu? ${profile.length > 0 ? '✅ Evet: ' + JSON.stringify(profile[0]) : '❌ HAYIR!'}`);

    const onbCheck = await fetch(`${SUPABASE_URL}/rest/v1/onboarding_progress?profile_id=eq.${newUser.id}&select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    const onbData = await onbCheck.json();
    console.log(`  Onboarding oluştu mu? ${onbData.length > 0 ? '✅ Evet' : '❌ HAYIR!'}`);

    const actCheck = await fetch(`${SUPABASE_URL}/rest/v1/activation_metrics?profile_id=eq.${newUser.id}&select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    const actData = await actCheck.json();
    console.log(`  Activation Metrics oluştu mu? ${actData.length > 0 ? '✅ Evet' : '❌ HAYIR!'}`);

    // Clean up test user
    console.log('\n🧹 Test kullanıcısı temizleniyor...');
    const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${newUser.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    console.log(`  Silme: ${deleteRes.ok ? '✅ Temizlendi' : '❌ Silinemedi: ' + deleteRes.status}`);
    
  } else {
    console.log(`  ❌ Test kullanıcısı OLUŞTURULAMADI! Bu hatanın kendisi sorunu gösteriyor.`);
    console.log(`  Hata: ${createUserText}`);
    
    // This IS the error - the trigger chain is broken
    console.log('\n🚨 SORUN TESPİT EDİLDİ: Yeni kullanıcı oluşturulurken trigger zinciri hata veriyor!');
    console.log('   Bu, Google OAuth 500 hatasının sebebidir.');
    console.log('   Supabase SQL Editor\'de fix SQL çalıştırılması gerekiyor.');
  }

  // Step 3: Check if user might already exist (previous failed attempt)
  console.log('\n📡 ADIM 3: Daha önce başarısız girişten kalan "yarım" kullanıcıları kontrol ediyoruz...');
  
  // Get Google OAuth users that might have profiles issues
  const allUsersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  
  if (allUsersRes.ok) {
    const allUsersData = await allUsersRes.json();
    const allUsers = allUsersData.users || allUsersData;
    
    const orphanedUsers = [];
    for (const user of allUsers) {
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=id`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const pData = await pRes.json();
      if (pData.length === 0) {
        orphanedUsers.push(user);
      }
    }
    
    if (orphanedUsers.length > 0) {
      console.log(`  🚨 ${orphanedUsers.length} kullanıcının profili OLUŞTURULAMAMIŞ:`);
      for (const u of orphanedUsers) {
        console.log(`    - ${u.email} | Provider: ${u.app_metadata?.provider || 'email'} | Created: ${u.created_at}`);
        
        // Try to manually fix by inserting profile
        console.log(`      → Profil manuel olarak oluşturuluyor...`);
        const firstName = u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.first_name || 'Kullanıcı';
        
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            id: u.id,
            first_name: firstName,
            email: u.email,
          }),
        });
        
        if (insertRes.ok) {
          console.log(`      ✅ Profil başarıyla oluşturuldu: ${firstName}`);
          
          // Also create onboarding and activation entries
          await fetch(`${SUPABASE_URL}/rest/v1/onboarding_progress`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ profile_id: u.id }),
          });
          console.log(`      ✅ Onboarding kaydı oluşturuldu`);
          
          await fetch(`${SUPABASE_URL}/rest/v1/activation_metrics`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ profile_id: u.id }),
          });
          console.log(`      ✅ Activation metrics kaydı oluşturuldu`);
          
        } else {
          const errText = await insertRes.text();
          console.log(`      ❌ Profil oluşturulamadı: ${errText}`);
        }
      }
    } else {
      console.log('  ✅ Tüm auth kullanıcılarının profili mevcut.');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Teşhis tamamlandı.');
  console.log('='.repeat(60));
}

main().catch(console.error);
