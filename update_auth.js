const fs = require('fs');

function processAuthFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Background, Font, and Outer Wrapper
  content = content.replace(/className="flex min-h-dvh w-full items-center justify-center p-4[^"]*"(?:\s*style=\{\{[^}]+\}\})?/g, 
    'className="flex min-h-dvh w-full items-center justify-center p-4 bg-[#FAF8FF] font-montserrat"');

  // 2. Card Wrappers
  // Replace: <div className="w-full max-w-sm relative"> \n <div className="relative bg-white rounded-[32px] ...
  content = content.replace(/className="w-full max-w-sm(?: relative)?"[\s\S]*?<div className="(?:relative )?bg-white rounded-\[32px\][^"]*"/g, 
    'className="w-full max-w-sm">\n        <div className="bg-white rounded-2xl p-6 shadow-xl border border-border w-full relative overflow-hidden"');

  // Replace direct cards if they match exactly
  content = content.replace(/className="w-full max-w-sm bg-white rounded-\[32px\][^"]*"/g, 
    'className="bg-white rounded-2xl p-6 shadow-xl border border-border w-full max-w-sm relative overflow-hidden"');

  // Reset password outer card
  content = content.replace(/className="w-full max-w-sm bg-white rounded-\[32px\][^"]* p-7 sm:p-8[^"]*"/g, 
    'className="bg-white rounded-2xl p-6 shadow-xl border border-border w-full max-w-sm relative overflow-hidden"');

  // 3. Remove "Mor üst şerit"
  content = content.replace(/<div className="h-1\.5 w-full bg-gradient-to-r from-primary via-violet-500 to-primary"\s*\/>/g, '');

  // 4. Logo Block
  const logoBlock = `
            <div className="flex flex-col items-center mb-6">
              <Image src="/logo.webp" alt="Odi.Pet" width={72} height={72} className="mb-2" priority />
              <p className="text-[11px] text-text-muted font-medium">Pet Yaşam Ekosistemi</p>
            </div>
  `.trim();

  // In login and register, logo is wrapped in <Link>
  content = content.replace(/<div className="flex flex-col items-center gap-3 mb-[67]">[\s\S]*?<\/div>\s*<\/div>/g, logoBlock);
  
  // In reset/update password, there's a Link wrapping the image inside text-center
  content = content.replace(/<Link href="\/" className="inline-flex[^>]*>[\s\S]*?<\/Link>/g, logoBlock);

  // 5. Primary Buttons
  content = content.replace(/className="btn-primary[^"]*"/g, 'className="w-full bg-[#4726AF] text-white rounded-xl font-medium text-[15px] py-3 mt-1 hover:opacity-90 transition-opacity flex items-center justify-center shadow-md disabled:opacity-60"');
  
  // Specific for login
  content = content.replace(/className={`w-full h-\[50px\] rounded-btn font-black text-\[15px\] mt-1 disabled:opacity-60 flex items-center justify-center[\s\S]*?`}/g, 
    'className={`w-full bg-[#4726AF] text-white rounded-xl font-medium text-[15px] py-3 mt-1 hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-60 ${lockoutUntil !== null ? \'cursor-not-allowed bg-slate-300 text-slate-500\' : \'\'}`}');

  // 6. Input fields -> Add rounded-xl
  content = content.replace(/className="input-base([^"]*)"/g, (match, g1) => {
    if (g1.includes('rounded-xl')) return match;
    return `className="input-base rounded-xl${g1}"`;
  });

  // 7. Social Buttons
  const socialContainerRegex = /<div className="flex flex-col gap-2\.5 mb-5">[\s\S]*?<\/div>\s*\{\/\* ── Ayraç ── \*\/\}/m;
  const socialReplacement = `
            <div className="flex flex-col gap-3 mb-5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || appleLoading || loading}
                className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl bg-white text-[13px] font-medium text-text-primary active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {googleLoading ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google ile Giriş Yap
              </button>

              <button
                type="button"
                onClick={handleAppleLogin}
                disabled={googleLoading || appleLoading || loading}
                className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl bg-white text-[13px] font-medium text-text-primary active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {appleLoading ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z"/>
                    <path d="M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                )}
                Apple ile Giriş Yap
              </button>
            </div>
            {/* ── Ayraç ── */}
  `.trim();

  // Fix social buttons in login
  if (content.match(socialContainerRegex)) {
    content = content.replace(socialContainerRegex, socialReplacement);
  } 
  
  // Fix social buttons in register
  const regSocialRegex = /<div className="flex flex-col gap-2\.5">[\s\S]*?<\/div>\s*\{\/\* Ayraç \*\/\}/m;
  if (content.match(regSocialRegex)) {
    content = content.replace(regSocialRegex, socialReplacement.replace('Giriş Yap', 'devam et').replace('Giriş Yap', 'devam et').replace('{/* ── Ayraç ── */}', '{/* Ayraç */}'));
  }

  // 8. Fix specific texts
  if (filePath.includes('login')) {
    content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, '<h1 className="text-[22px] font-black text-text-primary tracking-tighter leading-snug mt-3">Giriş Yap</h1>');
    content = content.replace(/<p className="text-\[11px\] font-black text-primary\/70 mt-1 uppercase tracking-\[0\.18em\]">\s*Hoş Geldiniz\s*<\/p>/g, '<p className="text-[12px] text-text-secondary mt-1">Sevgiyle Bak, Sağlıkla Büyüt</p>');
  } else if (filePath.includes('register')) {
    content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, '<h1 className="text-[22px] font-black text-text-primary tracking-tighter mt-3">Aramıza Katıl</h1>');
    content = content.replace(/<p className="text-\[10px\] font-black text-text-secondary\/60 mt-1 uppercase tracking-widest">\s*Odi\.Pet Ekosistemine Katılın\s*<\/p>/g, '<p className="text-[12px] text-text-secondary mt-1">Sevgiyle Bak, Sağlıkla Büyüt</p>');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

['login', 'register', 'reset-password', 'update-password'].forEach(f => {
  processAuthFile('C:/Odi.Pet/src/app/' + f + '/page.tsx');
});

console.log('Update auth script finished');
