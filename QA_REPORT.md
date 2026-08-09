# Odi.Pet Autonomous QA Report

**Run ID:** `run-1786280973244`  
**Generated At:** `2026-08-09T13:09:33.244Z`  
**Branch:** `phase18-wip` | **Commit:** `a3982da`  
**Test Base URL:** `http://127.0.0.1:3100` | **Supabase URL:** `http://127.0.0.1:54321`  

---

## 📊 Summary

- **Total Executed:** 27
- **Passed:** ✅ 12
- **Failed:** ❌ 15
- **Flaky:** ⚡ 0
- **Skipped / Blocked:** ⛔ 0
- **Regressions:** ⚠️ 0

---

## 🔍 Failure Classifications

| Classification | Count | Description |
| :--- | :--- | :--- |
| **APP_BUG** | 0 | Uygulama UI/davranış beklenenden farklı |
| **TEST_BUG** | 0 | Test fixture/selector hatası |
| **ENVIRONMENT** | 0 | Sunucu/Port/DB erişim sorunu |
| **AUTH_FAILURE** | 1 | Kimlik doğrulama/Session hatası |
| **DATABASE_FAILURE** | 0 | Supabase DB sorgu/veri hatası |
| **TIMEOUT** | 14 | Test zaman aşımı |
| **FLAKY** | 0 | Retry sonrası geçen kararsız test |

---

## 🚨 Regressions (0)

_Henüz yeni regression bulunmadı._

---

## 🛠 Recommended Actions

- 🔑 AUTHENTICATION HATASI: Test kullanıcısı session veya yetkilendirme yönlendirmesi başarısız.

---

## 📜 Detailed Test Execution List

- [✅ PASS] **Odi.Pet Auth & Onboarding Flow - Full Lifecycle** (49695ms)
  
- [❌ AUTH_FAILURE] **Odi.Pet Auth & Onboarding Flow - Full Lifecycle** (52621ms)
    _Message:_ `Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed

Expected pattern: [32m/\/owner\/dashboard/[39m
Received string:  [31m"http://127.0.0.1:3100/login?nosplash=true"[39m
Timeout: 15000ms

Call log:
[2m  - Expect "toHaveURL" with timeout 15000ms[22m
[2m    32 × locator resolved to <html lang="tr" class="antialiased h-full">…</html>[22m
[2m       - unexpected value "http://127.0.0.1:3100/login?nosplash=true"[22m
`
- [❌ TIMEOUT] **Odi.Pet Auth & Onboarding Flow - Full Lifecycle** (31053ms)
    _Message:_ `Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('text=Aramıza Hoş Geldiniz!')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 10000ms[22m
[2m  - waiting for locator('text=Aramıza Hoş Geldiniz!')[22m
[2m    - waiting for navigation to finish...[22m
`
- [❌ TIMEOUT] **1. SmartBanner rendering & Pet switcher check** (14614ms)
    _Message:_ `Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed

Expected pattern: [32m/\/owner\/pets\//[39m
Received string:  [31m"http://127.0.0.1:3100/owner/dashboard"[39m
Timeout: 10000ms

Call log:
[2m  - Expect "toHaveURL" with timeout 10000ms[22m
[2m    22 × locator resolved to <html lang="tr" class="antialiased h-full">…</html>[22m
[2m       - unexpected value "http://127.0.0.1:3100/owner/dashboard"[22m
`
- [❌ TIMEOUT] **2. Upcoming Tasks listing check** (13173ms)
    _Message:_ `Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('[data-testid="upcoming-task-item"], .card-base:has-text("Ajanda")').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 10000ms[22m
[2m  - waiting for locator('[data-testid="upcoming-task-item"], .card-base:has-text("Ajanda")').first()[22m
`
- [✅ PASS] **3. Quick Action Menu (+) check on mobile** (5310ms)
  
- [❌ TIMEOUT] **1. SmartBanner rendering & Pet switcher check** (21449ms)
    _Message:_ `Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed

Expected pattern: [32m/\/owner\/pets\//[39m
Received string:  [31m"http://127.0.0.1:3100/owner/dashboard"[39m
Timeout: 10000ms

Call log:
[2m  - Expect "toHaveURL" with timeout 10000ms[22m
[2m    19 × locator resolved to <html lang="tr" class="antialiased h-full">…</html>[22m
[2m       - unexpected value "http://127.0.0.1:3100/owner/dashboard"[22m
`
- [❌ TIMEOUT] **2. Upcoming Tasks listing check** (38522ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded.[39m`
- [❌ TIMEOUT] **3. Quick Action Menu (+) check on mobile** (27181ms)
    _Message:_ `Error: [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed

Expected pattern: [32m/\/owner\/scanner/[39m
Received string:  [31m"http://127.0.0.1:3100/owner/dashboard"[39m
Timeout: 10000ms

Call log:
[2m  - Expect "toHaveURL" with timeout 10000ms[22m
[2m    17 × locator resolved to <html lang="tr" class="antialiased h-full">…</html>[22m
[2m       - unexpected value "http://127.0.0.1:3100/owner/dashboard"[22m
`
- [❌ TIMEOUT] **1. SmartBanner rendering & Pet switcher check** (31639ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded.[39m`
- [❌ TIMEOUT] **2. Upcoming Tasks listing check** (31585ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded.[39m`
- [❌ TIMEOUT] **3. Quick Action Menu (+) check on mobile** (31266ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded.[39m`
- [✅ PASS] **Login page renders correctly** (2429ms)
  
- [✅ PASS] **Shows error for wrong credentials** (2307ms)
  
- [✅ PASS] **Authenticated user is redirected away from /login** (8263ms)
  
- [✅ PASS] **Login page renders correctly** (7263ms)
  
- [✅ PASS] **Shows error for wrong credentials** (29170ms)
  
- [✅ PASS] **Authenticated user is redirected away from /login** (16490ms)
  
- [❌ TIMEOUT] **Login page renders correctly** (6557ms)
    _Message:_ `Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

Locator: locator('input[name="email"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
[2m  - Expect "toBeVisible" with timeout 5000ms[22m
[2m  - waiting for locator('input[name="email"]')[22m
`
- [❌ TIMEOUT] **Shows error for wrong credentials** (31912ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded.[39m`
- [❌ TIMEOUT] **Authenticated user is redirected away from /login** (31772ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded.[39m`
- [✅ PASS] **Dashboard loads and shows pet cards or empty state** (9754ms)
  
- [✅ PASS] **Dashboard loads and shows pet cards or empty state** (22501ms)
  
- [❌ TIMEOUT] **Dashboard loads and shows pet cards or empty state** (31561ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded while running "beforeEach" hook.[39m`
- [✅ PASS] **Pet shortcut returns to dashboard and exposes the seeded pet** (8166ms)
  
- [✅ PASS] **Pet shortcut returns to dashboard and exposes the seeded pet** (20038ms)
  
- [❌ TIMEOUT] **Pet shortcut returns to dashboard and exposes the seeded pet** (31611ms)
    _Message:_ `[31mTest timeout of 30000ms exceeded while running "beforeEach" hook.[39m`
