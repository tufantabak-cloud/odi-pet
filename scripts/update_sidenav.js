const fs = require('fs');
const path = require('path');

const sideNavPath = path.join(process.cwd(), 'src/components/SideNav.tsx');
let content = fs.readFileSync(sideNavPath, 'utf8');

const newLinks = `
  {
    href: '/owner/learn',
    label: 'İçerikler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
    ),
  },
  {
    href: '/owner/messages',
    label: 'Mesajlar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
  },
  {
    href: '/owner/budget',
    label: 'Bütçe',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4H6a2 2 0 0 1-2-2z"/></svg>
    ),
  },
  {
    href: '/owner/events',
    label: 'Etkinlikler',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
  },
  {
    href: '/owner/marketplace',
    label: 'Mağaza',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
    ),
  },
`;

const insertIndex = content.indexOf('const shortcutItems');
if (insertIndex !== -1) {
    // Find the end of primaryItems array
    const previousBracket = content.lastIndexOf(']', insertIndex);
    if (previousBracket !== -1) {
        content = content.slice(0, previousBracket) + newLinks + content.slice(previousBracket);
        fs.writeFileSync(sideNavPath, content);
        console.log('SideNav.tsx updated.');
    }
} else {
    console.log('Could not find injection point.');
}
