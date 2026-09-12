import { test, expect } from '@playwright/test';

test('Verify profile cards for MIKROTEST_PET after successful login with updated credentials', async ({ page, context }) => {
  // Let's set cookies directly in the playwright browser context for server-side auth recognition
  // Supabase cookie name pattern is typically sb-<project-ref>-auth-token
  const projectRef = 'soautcxgiqhxiaxrubxv';
  
  console.log('Navigating to login page to initialize storage...');
  await page.goto('https://odi.pet/login');
  
  const sessionData = await page.evaluate(async () => {
    const supabaseUrl = 'https://soautcxgiqhxiaxrubxv.supabase.co';
    const supabaseAnonKey = 'sb_publishable_ypojkLLZ3o4WUI1COXAXdw_mb2kXNJP';
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = async () => {
        try {
          // @ts-ignore
          const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test@odipet.com',
            password: 'att1472o'
          });
          if (error) {
            resolve({ success: false, error: error.message });
          } else {
            resolve({ success: true, session: data.session });
          }
        } catch (e: any) {
          resolve({ success: false, error: e.message });
        }
      };
      document.head.appendChild(script);
    });
  });

  console.log('Supabase Login Result in Browser Context:', sessionData);

  if (sessionData && (sessionData as any).success) {
    const session = (sessionData as any).session;
    
    // Inject local storage
    await page.evaluate((sess) => {
      localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(sess));
    }, session);
    
    // In next.js supabase ssr, cookie names are sb-<project-ref>-auth-token.0 and .1 (for chunks) or just supabase.auth.token
    // Let's inject cookies for server side using context.addCookies
    // We can also see how it is named in our app. Let's create cookies:
    // next-auth session cookie is not used since this is supabase, so the cookie name is sb-<projectRef>-auth-token
    const baseCookieName = `sb-${projectRef}-auth-token`;
    // Supabase ssr library sometimes chunks the token, or stores it as json.
    // Let's set both chunks and the normal JSON string.
    const sessionString = JSON.stringify(session);
    
    // Let's set standard cookie format for SSR:
    await context.addCookies([
      {
        name: `${baseCookieName}`,
        value: encodeURIComponent(sessionString),
        domain: 'odi.pet',
        path: '/',
        secure: true,
        sameSite: 'Lax'
      },
      {
        name: `${baseCookieName}.0`,
        value: encodeURIComponent(sessionString.substring(0, 1000)),
        domain: 'odi.pet',
        path: '/',
        secure: true,
        sameSite: 'Lax'
      },
      {
        name: `sb-access-token`,
        value: session.access_token,
        domain: 'odi.pet',
        path: '/',
        secure: true,
        sameSite: 'Lax'
      },
      {
        name: `sb-refresh-token`,
        value: session.refresh_token,
        domain: 'odi.pet',
        path: '/',
        secure: true,
        sameSite: 'Lax'
      }
    ]);
    
    console.log('Cookies injected.');
  }

  // Go to pet page directly
  const petUrl = 'https://odi.pet/owner/pets/b16d322b-7f18-4366-aef0-25eae8392ce7';
  console.log(`Navigating to pet page: ${petUrl}`);
  await page.goto(petUrl);
  
  await page.waitForTimeout(10000);
  console.log('Current URL at Pet Page:', page.url());
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'scratch/pet_detail_loaded_final.png', fullPage: true });
  
  const content = await page.content();
  
  const hasProfileStrengthen = content.includes('Profilini güçlendir') || content.includes('Profilini Güçlendir');
  console.log('Has \"Profilini güçlendir\":', hasProfileStrengthen);
  
  const pageTexts = await page.evaluate(() => {
    const allText = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, p, span, button, a'))
      .map(el => el.textContent?.trim())
      .filter(Boolean);
    return allText;
  });
  
  const textFiltered = pageTexts.filter(text => text.length > 3 && text.length < 150);
  console.log('Page Text Excerpts:', textFiltered.slice(0, 150));
});
