import React from 'react';
import { CategoryKey } from '@/lib/categoryThemes';

export interface IconProps {
  width?: number | string;
  height?: number | string;
  size?: number | string;
  className?: string;
  isSelected?: boolean;
}

export type BadgeSize = 'sm' | 'md' | 'lg' | 'xl' | 'none';

// ── Sample Icon Pack Components (Unified Lavender Squircle Badge + Line Icon) ──
export function IconBadge({
  children,
  size = 24,
  badgeSize = 'md',
  className = '',
  isSelected = false
}: {
  children?: React.ReactNode;
  size?: number;
  badgeSize?: BadgeSize;
  className?: string;
  isSelected?: boolean;
}) {
  if (badgeSize === 'none') {
    return <>{children}</>;
  }

  const badgeDimensions = {
    sm: 'w-8 h-8 rounded-xl p-1.5',
    md: 'w-10 h-10 rounded-2xl p-2.5',
    lg: 'w-12 h-12 rounded-2xl p-3',
    xl: 'w-14 h-14 rounded-2xl p-3.5',
  }[badgeSize];

  const scaleClass = isSelected ? 'scale-105 ring-2 ring-[#5955D8]/40' : 'hover:scale-105';

  return (
    <div
      className={`inline-flex items-center justify-center bg-[#EEECFE] text-[#5955D8] shrink-0 transition-all duration-200 ${badgeDimensions} ${scaleClass} ${className}`}
    >
      {children}
    </div>
  );
}

// 1. ShieldCheckIcon - Aşı / Güvenlik / Sağlık Doğrulama / Belge Kasası (Example Icon Pack - Top Icon)
export function ShieldCheckIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </IconBadge>
  );
}

// 2. BugIcon - Parazit / Haşere / İç-Dış Parazit / Teşhis (Example Icon Pack - Middle Icon)
export function BugIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="14" x="8" y="6" rx="4" />
        <path d="M12 6v14" />
        <path d="M19 9h-3" />
        <path d="M5 9h3" />
        <path d="M20 13h-4" />
        <path d="M4 13h4" />
        <path d="M19 17h-3" />
        <path d="M5 17h3" />
        <path d="m10 6-2-3" />
        <path d="m14 6 2-3" />
      </svg>
    </IconBadge>
  );
}

// 3. ScaleIcon - Kilo / Ölçüm / Tartı / Dozlama (Example Icon Pack - Bottom Icon)
export function ScaleIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h18" />
      </svg>
    </IconBadge>
  );
}

// 4. UtensilsIcon - Beslenme / Mama
export function UtensilsIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
        <path d="M15 2v20" />
        <path d="M5 2v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2" />
        <path d="M9 12v10" />
      </svg>
    </IconBadge>
  );
}

// 5. SparklesIcon - Bakım / Hijyen / Banyo
export function SparklesIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
      </svg>
    </IconBadge>
  );
}

// 6. ActivityIcon - Aktivite / Yürüyüş / Egzersiz
export function ActivityIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    </IconBadge>
  );
}

// 7. CalendarIcon - Ajanda / Takvim / Randevular
export function CalendarIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    </IconBadge>
  );
}

// 8. StethoscopeIcon - Veteriner & Genel Sağlık
export function StethoscopeIcon({ size = 22, className = '', isSelected = false, badgeSize = 'md' }: IconProps & { size?: number; badgeSize?: BadgeSize }) {
  return (
    <IconBadge size={size} badgeSize={badgeSize} isSelected={isSelected} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .2.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    </IconBadge>
  );
}

// 1. ShampooIcon - Bakım

export function ShampooIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="shampooGrad" x1="6" y1="6" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B9B" />
          <stop offset="100%" stopColor="#9E59FF" />
        </linearGradient>
        <linearGradient id="bubbleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15"/>
        </linearGradient>
        <filter id="shampooShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#9E59FF" floodOpacity="0.35"/>
        </filter>
      </defs>
      {/* Bottle Cap */}
      <rect x="13" y="2" width="6" height="3" rx="1.5" fill="#843CEF" />
      {/* Bottle Neck */}
      <rect x="14" y="5" width="4" height="2" fill="#E2D4FF" />
      {/* Bottle Body */}
      <path d="M10 7C7.5 7 7 9 7 12V25C7 27.5 9 29 12 29H20C23 29 25 27.5 25 25V12C25 9 24.5 7 22 7H10Z" fill="url(#shampooGrad)" filter="url(#shampooShadow)" />
      {/* Paw Print Label */}
      <circle cx="16" cy="18" r="4" fill="#FFFFFF" fillOpacity="0.25" />
      <circle cx="16" cy="18.5" r="1.8" fill="#FFFFFF" />
      <circle cx="13.5" cy="16.5" r="0.8" fill="#FFFFFF" />
      <circle cx="16" cy="15.2" r="0.8" fill="#FFFFFF" />
      <circle cx="18.5" cy="16.5" r="0.8" fill="#FFFFFF" />
      {/* Bubbles */}
      <circle cx="5" cy="9" r="2" fill="url(#bubbleGrad)" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="0.5"/>
      <circle cx="27" cy="8" r="3" fill="url(#bubbleGrad)" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="0.5"/>
      <circle cx="28" cy="16" r="1.5" fill="url(#bubbleGrad)" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="0.5"/>
    </svg>
  );
}

// 2. ScoopIcon - Temizlik (Turquoise-to-Teal)
export function ScoopIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="scoopGrad" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00ECC6" />
          <stop offset="100%" stopColor="#00A896" />
        </linearGradient>
        <filter id="scoopShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#00A896" floodOpacity="0.35"/>
        </filter>
      </defs>
      {/* Scoop Shovel Back/Base */}
      <path d="M8 6C8 4.9 8.9 4 10 4H22C23.1 4 24 4.9 24 6V18C24 20.2 22.2 22 20 22H12C9.8 22 8 20.2 8 18V6Z" fill="url(#scoopGrad)" filter="url(#scoopShadow)" />
      {/* Slots (grill lines) */}
      <rect x="11" y="8" width="2" height="8" rx="1" fill="#FFFFFF" fillOpacity="0.45" />
      <rect x="15" y="8" width="2" height="8" rx="1" fill="#FFFFFF" fillOpacity="0.45" />
      <rect x="19" y="8" width="2" height="8" rx="1" fill="#FFFFFF" fillOpacity="0.45" />
      {/* Handle */}
      <path d="M14 22V28C14 29.1 14.9 30 16 30C17.1 30 18 29.1 18 28V22H14Z" fill="#008475" />
      {/* Sparkles */}
      <path d="M27 6L28 8L30 9L28 10L27 12L26 10L24 9L26 8L27 6Z" fill="#FFDF00" />
      <path d="M5 20L5.5 21L6.5 21.5L5.5 22L5 23L4.5 22L3.5 21.5L4.5 21L5 20Z" fill="#FFDF00" />
    </svg>
  );
}

// 3. BoneIcon - Aktivite (Orange-to-Red)
export function BoneIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="boneGrad" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF9F43" />
          <stop offset="100%" stopColor="#FF3F3F" />
        </linearGradient>
        <linearGradient id="ballGrad" x1="20" y1="20" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A8FF35" />
          <stop offset="100%" stopColor="#55B300" />
        </linearGradient>
        <filter id="boneShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#FF3F3F" floodOpacity="0.4"/>
        </filter>
      </defs>
      {/* Bone */}
      <g filter="url(#boneShadow)">
        <path d="M12.5 10.5L9.5 7.5C8.1 6.1 5.9 6.1 4.5 7.5C3.1 8.9 3.1 11.1 4.5 12.5L7.5 15.5L12.5 10.5Z" fill="url(#boneGrad)" />
        <path d="M19.5 17.5L22.5 20.5C23.9 21.9 26.1 21.9 27.5 20.5C28.9 19.1 28.9 16.9 27.5 15.5L24.5 12.5L19.5 17.5Z" fill="url(#boneGrad)" />
        {/* Center Bar */}
        <rect x="8" y="18" width="18" height="6" rx="3" transform="rotate(-45 8 18)" fill="url(#boneGrad)" />
      </g>
      {/* Green Rolling Ball */}
      <circle cx="24" cy="9" r="4.5" fill="url(#ballGrad)" />
      <path d="M16 6H18" stroke="#FF9F43" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 9H17" stroke="#FF9F43" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 4. PillIcon - Medikal / Aşı / Tedavi (Red-to-Blue Capsule with medical cross & paw print)
export function PillIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="pillRedGrad" x1="6" y1="12" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4D6D" />
          <stop offset="100%" stopColor="#C9184A" />
        </linearGradient>
        <linearGradient id="pillBlueGrad" x1="16" y1="10" x2="26" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4EA8DE" />
          <stop offset="100%" stopColor="#5E60CE" />
        </linearGradient>
        <filter id="pillShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#5E60CE" floodOpacity="0.35"/>
        </filter>
      </defs>
      <g filter="url(#pillShadow)" transform="rotate(30 16 16)">
        {/* Pill Left Half */}
        <path d="M8 12C8 9.2 10.2 7 13 7H16V25H13C10.2 25 8 22.8 8 20V12Z" fill="url(#pillRedGrad)" />
        {/* Pill Right Half */}
        <path d="M16 7H19C21.8 7 24 9.2 24 12V20C24 22.8 21.8 25 19 25H16V7Z" fill="url(#pillBlueGrad)" />
        {/* White divider ring */}
        <rect x="15" y="6.5" width="2" height="19" rx="1" fill="#FFFFFF" />
        {/* Medical Cross on Red Half */}
        <path d="M11 16H13M12 15V17" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        {/* Paw shape on Blue Half */}
        <circle cx="20" cy="16" r="1.5" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="18.5" cy="14" r="0.6" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="20" cy="13.2" r="0.6" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="21.5" cy="14" r="0.6" fill="#FFFFFF" fillOpacity="0.85" />
      </g>
    </svg>
  );
}

// 5. CarrierIcon - Veteriner (Violet-to-Indigo Pet Carrier)
export function CarrierIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="carrierGrad" x1="4" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7209B7" />
          <stop offset="100%" stopColor="#3F37C9" />
        </linearGradient>
        <linearGradient id="windowGrad" x1="10" y1="12" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEE440" />
          <stop offset="100%" stopColor="#F77F00" />
        </linearGradient>
        <filter id="carrierShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#3F37C9" floodOpacity="0.35"/>
        </filter>
      </defs>
      {/* Handle on top */}
      <path d="M11 8V5C11 3.9 11.9 3 13 3H19C20.1 3 21 3.9 21 5V8H11Z" fill="#4895EF" />
      {/* Carrier Main Body */}
      <rect x="4" y="8" width="24" height="20" rx="4" fill="url(#carrierGrad)" filter="url(#carrierShadow)" />
      {/* Front Metal Gate/Window */}
      <rect x="9" y="12" width="14" height="12" rx="2" fill="url(#windowGrad)" />
      {/* Metal Grill lines */}
      <line x1="12" y1="12" x2="12" y2="24" stroke="#4F3800" strokeWidth="1.5" strokeOpacity="0.25" />
      <line x1="16" y1="12" x2="16" y2="24" stroke="#4F3800" strokeWidth="1.5" strokeOpacity="0.25" />
      <line x1="20" y1="12" x2="20" y2="24" stroke="#4F3800" strokeWidth="1.5" strokeOpacity="0.25" />
      <line x1="9" y1="15" x2="23" y2="15" stroke="#4F3800" strokeWidth="1.5" strokeOpacity="0.25" />
      <line x1="9" y1="19" x2="23" y2="19" stroke="#4F3800" strokeWidth="1.5" strokeOpacity="0.25" />
    </svg>
  );
}

// 6. BowlIcon - Beslenme (Gold-to-Orange Pet Food Bowl)
export function BowlIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="bowlGrad" x1="4" y1="14" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB703" />
          <stop offset="100%" stopColor="#FB8500" />
        </linearGradient>
        <linearGradient id="kibbleGrad" x1="8" y1="6" x2="24" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A06A42" />
          <stop offset="100%" stopColor="#6F4522" />
        </linearGradient>
        <filter id="bowlShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#FB8500" floodOpacity="0.4"/>
        </filter>
      </defs>
      {/* Food Mound */}
      <path d="M8 16C8 10.5 11.6 8 16 8C20.4 8 24 10.5 24 16H8Z" fill="url(#kibbleGrad)" />
      {/* Small kibble pieces on top */}
      <circle cx="13" cy="10" r="1.5" fill="#4E3118" />
      <circle cx="16" cy="7.5" r="1.2" fill="#4E3118" />
      <circle cx="19" cy="9.5" r="1.5" fill="#4E3118" />
      {/* Bowl Base */}
      <path d="M4 24C4 18.5 6 15 8 15H24C26 15 28 18.5 28 24C28 27 25 28 22 28H10C7 28 4 27 4 24Z" fill="url(#bowlGrad)" filter="url(#bowlShadow)" />
      {/* Paw Print decoration on bowl */}
      <circle cx="16" cy="22" r="2.2" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="13.8" cy="20.5" r="0.9" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="16" cy="19.2" r="0.9" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="18.2" cy="20.5" r="0.9" fill="#FFFFFF" fillOpacity="0.8" />
    </svg>
  );
}

// 7. HouseIcon - Diğer / Dog House (Warm Red-to-Orange Roof & Walls)
export function HouseIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="roofGrad" x1="4" y1="4" x2="28" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF5E62" />
          <stop offset="100%" stopColor="#FF9966" />
        </linearGradient>
        <linearGradient id="wallGrad" x1="6" y1="16" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EAEAEA" />
          <stop offset="100%" stopColor="#CCCCCC" />
        </linearGradient>
        <filter id="houseShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#FF5E62" floodOpacity="0.3"/>
        </filter>
      </defs>
      {/* House Walls */}
      <rect x="6" y="15" width="20" height="13" rx="2" fill="url(#wallGrad)" filter="url(#houseShadow)" />
      {/* Entry/Doorway */}
      <path d="M12 28V22C12 19.8 13.8 18 16 18C18 18 19.8 19.8 19.8 22V28H12Z" fill="#5F5F5F" />
      {/* Roof */}
      <path d="M16 3L3.5 15.5C2.9 16.1 3.3 17 4.2 17H27.8C28.7 17 29.1 16.1 28.5 15.5L16 3Z" fill="url(#roofGrad)" />
      {/* Small hanging tag above door */}
      <rect x="14" y="14" width="4" height="2" rx="1" fill="#FFDF00" />
    </svg>
  );
}

// 8. VetIcon - AI Vet / Stetoskop ve Robot (Pink-to-Purple gradient with a friendly paw stetoscope)
export function VetIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="vetGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F72585" />
          <stop offset="100%" stopColor="#7209B7" />
        </linearGradient>
        <filter id="vetShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#7209B7" floodOpacity="0.4"/>
        </filter>
      </defs>
      <g filter="url(#vetShadow)">
        {/* Robot Head Base */}
        <rect x="7" y="10" width="18" height="14" rx="4" fill="url(#vetGrad)" />
        {/* Ears / Antennas */}
        <rect x="10" y="7" width="2" height="3" fill="#F72585" rx="1" />
        <rect x="20" y="7" width="2" height="3" fill="#F72585" rx="1" />
        <circle cx="11" cy="6" r="1.5" fill="#7209B7" />
        <circle cx="21" cy="6" r="1.5" fill="#7209B7" />
        {/* Friendly Screen Eyes */}
        <circle cx="12" cy="16" r="2" fill="#FFFFFF" />
        <circle cx="20" cy="16" r="2" fill="#FFFFFF" />
        {/* Glowing Cheeks */}
        <circle cx="12" cy="16" r="1" fill="#7209B7" />
        <circle cx="20" cy="16" r="1" fill="#7209B7" />
        {/* Friendly smile */}
        <path d="M14 19.5C15 20.5 17 20.5 18 19.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        {/* Medical Cross Collar */}
        <rect x="13" y="24" width="6" height="4" rx="1" fill="#7209B7" />
        <path d="M15 26H17M16 25V27" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// 9. RulerIcon - Gelişim / Boy - Kilo / Ölçüm (Teal-to-Green gradient with a scale and scale line)
export function RulerIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="rulerGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#48CAE4" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <filter id="rulerShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0077B6" floodOpacity="0.4"/>
        </filter>
      </defs>
      <g filter="url(#rulerShadow)">
        {/* Scale Platform */}
        <path d="M5 24C5 21.8 6.8 20 9 20H23C25.2 20 27 21.8 27 24C27 25.1 26.1 26 25 26H7C5.9 26 5 25.1 5 24Z" fill="url(#rulerGrad)" />
        {/* Scale Display */}
        <rect x="11" y="21.5" width="10" height="3.5" rx="1" fill="#FFFFFF" />
        {/* Scale digits or weight text mock */}
        <rect x="13" y="22.5" width="6" height="1.5" rx="0.5" fill="#0077B6" fillOpacity="0.4" />
        {/* Scale Stand */}
        <path d="M15 15V20H17V15H15Z" fill="#0096C7" />
        {/* Standing Paw/Weight top */}
        <circle cx="16" cy="11.5" r="3.5" fill="url(#rulerGrad)" />
        <circle cx="13.2" cy="7.5" r="1" fill="url(#rulerGrad)" />
        <circle cx="16" cy="6.2" r="1.2" fill="url(#rulerGrad)" />
        <circle cx="18.8" cy="7.5" r="1" fill="url(#rulerGrad)" />
      </g>
    </svg>
  );
}

// 10. VaccineIcon - Aşı / Şırınga (Blue-to-Indigo gradient syringe with drop shadow)
export function VaccineIcon({ width, height, size, className = '', isSelected = false }: IconProps) {
  const w = width ?? size ?? 34;
  const h = height ?? size ?? 34;
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="vacGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4361EE" />
          <stop offset="100%" stopColor="#3F37C9" />
        </linearGradient>
        <filter id="vacShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#3F37C9" floodOpacity="0.4"/>
        </filter>
      </defs>
      <g filter="url(#vacShadow)" transform="rotate(45 16 16)">
        {/* Syringe Plunger */}
        <rect x="15" y="3" width="2" height="6" fill="#4361EE" />
        <rect x="13" y="2" width="6" height="1.5" rx="0.5" fill="#4361EE" />
        {/* Syringe Body */}
        <rect x="12" y="9" width="8" height="14" rx="1.5" fill="url(#vacGrad)" />
        {/* Inside liquid level */}
        <rect x="13" y="12" width="6" height="9" fill="#FFFFFF" fillOpacity="0.3" />
        {/* Syringe markings */}
        <line x1="13.5" y1="14" x2="15.5" y2="14" stroke="#FFFFFF" strokeWidth="0.8" />
        <line x1="13.5" y1="16" x2="15.5" y2="16" stroke="#FFFFFF" strokeWidth="0.8" />
        <line x1="13.5" y1="18" x2="15.5" y2="18" stroke="#FFFFFF" strokeWidth="0.8" />
        {/* Syringe Needle base */}
        <path d="M14 23H18L17 25H15L14 23Z" fill="#3F37C9" />
        {/* Needle */}
        <line x1="16" y1="25" x2="16" y2="30" stroke="#7209B7" strokeWidth="1" />
        {/* Paw Print decoration */}
        <circle cx="16" cy="10.5" r="0.8" fill="#FFFFFF" fillOpacity="0.9" />
      </g>
    </svg>
  );
}

// 11. PawIcon - Pati (Universal Pet Icon)
export function PawIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="pawGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4EA8DE" />
          <stop offset="100%" stopColor="#5E60CE" />
        </linearGradient>
        <filter id="pawShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#5E60CE" floodOpacity="0.4"/>
        </filter>
      </defs>
      <g filter="url(#pawShadow)">
        <circle cx="16" cy="19.5" r="5" fill="url(#pawGrad)" />
        <circle cx="11" cy="11.5" r="2.2" fill="url(#pawGrad)" />
        <circle cx="16" cy="9.5" r="2.5" fill="url(#pawGrad)" />
        <circle cx="21" cy="11.5" r="2.2" fill="url(#pawGrad)" />
      </g>
    </svg>
  );
}

// 12. FirstAidIcon - Sağlık (Red-to-Crimson Medical Kit / First Aid Box)
export function FirstAidIcon({ width = 34, height = 34, className = '', isSelected = false }: IconProps) {
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="firstAidGrad" x1="4" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF5C5C" />
          <stop offset="100%" stopColor="#D90429" />
        </linearGradient>
        <filter id="firstAidShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#D90429" floodOpacity="0.35"/>
        </filter>
      </defs>
      {/* Handle on top */}
      <path d="M12 9V6C12 4.9 12.9 4 14 4H18C19.1 4 20 4.9 20 6V9H12Z" fill="#FCA311" stroke="#D90429" strokeWidth="1" />
      {/* First Aid Main Body */}
      <rect x="5" y="9" width="22" height="18" rx="4" fill="url(#firstAidGrad)" filter="url(#firstAidShadow)" />
      {/* White Medical Badge */}
      <circle cx="16" cy="18" r="5" fill="#FFFFFF" />
      {/* Red Cross */}
      <rect x="15" y="15" width="2" height="6" rx="0.5" fill="#D90429" />
      <rect x="13" y="17" width="6" height="2" rx="0.5" fill="#D90429" />
      {/* Corner protectors or buckle details for 3D premium look */}
      <circle cx="9" cy="13" r="1" fill="#FFFFFF" fillOpacity="0.3" />
      <circle cx="23" cy="13" r="1" fill="#FFFFFF" fillOpacity="0.3" />
    </svg>
  );
}

// 12.5 ParasiteIcon - Parazit Koruması (Teal-to-Green Protection Shield with a bug symbol)
export function ParasiteIcon({ width, height, size, className = '', isSelected = false }: IconProps) {
  const w = width ?? size ?? 34;
  const h = height ?? size ?? 34;
  const scaleClass = isSelected ? 'scale-[1.1]' : 'hover:scale-[1.05]';
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out ${scaleClass} ${className}`}
    >
      <defs>
        <linearGradient id="parasiteGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="parasiteShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#059669" floodOpacity="0.35"/>
        </filter>
      </defs>
      {/* Shield Shape */}
      <path d="M16 4L6 8V16C6 22 10 26.5 16 28C22 26.5 26 22 26 16V8L16 4Z" fill="url(#parasiteGrad)" filter="url(#parasiteShadow)" />
      {/* Inner Shield Line */}
      <path d="M16 6L8 9.2V16C8 20.8 11.2 24.5 16 25.8C20.8 24.5 24 20.8 24 16V9.2L16 6Z" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />
      {/* Bug / Virus icon inside */}
      <circle cx="16" cy="15" r="3.5" fill="#FFFFFF" />
      {/* Legs */}
      <line x1="12" y1="13" x2="14" y2="14.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11.5" y1="15" x2="13.5" y2="15" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="17" x2="14" y2="15.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="20" y1="13" x2="18" y2="14.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="20.5" y1="15" x2="18.5" y2="15" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="20" y1="17" x2="18" y2="15.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      {/* Head */}
      <circle cx="16" cy="10.5" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

// 13. DefaultCatAvatar - Minimalist 3D Sticker Style
export function DefaultCatAvatar({ width = "100%", height = "100%", className = '' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out hover:scale-[1.05] ${className}`}
    >
      <defs>
        <linearGradient id="catHeadGrad" x1="50" y1="30" x2="50" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>
        <linearGradient id="starGradCat" x1="15" y1="4" x2="35" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>

      {/* Floor Shadow */}
      <ellipse cx="50" cy="85" rx="30" ry="6" fill="#000000" fillOpacity="0.1" />

      {/* Ears Thickness (Back) */}
      <polygon points="25,43 32,18 45,38" fill="#CBD5E1" stroke="#CBD5E1" strokeWidth="6" strokeLinejoin="round" />
      <polygon points="75,43 68,18 55,38" fill="#CBD5E1" stroke="#CBD5E1" strokeWidth="6" strokeLinejoin="round" />

      {/* Ears Front */}
      <polygon points="25,40 32,15 45,35" fill="#F8FAFC" stroke="#F8FAFC" strokeWidth="6" strokeLinejoin="round" />
      <polygon points="75,40 68,15 55,35" fill="#F8FAFC" stroke="#F8FAFC" strokeWidth="6" strokeLinejoin="round" />

      {/* Ears Inner */}
      <polygon points="28,36 32,23 41,34" fill="#FBCFE8" stroke="#FBCFE8" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="72,36 68,23 59,34" fill="#FBCFE8" stroke="#FBCFE8" strokeWidth="3" strokeLinejoin="round" />

      {/* Head Thickness (Back) */}
      <rect x="20" y="34" width="60" height="48" rx="24" fill="#CBD5E1" />
      
      {/* Head Front */}
      <rect x="20" y="30" width="60" height="48" rx="24" fill="url(#catHeadGrad)" />

      {/* Face (Minimal) */}
      <circle cx="35" cy="50" r="4.5" fill="#334155" />
      <circle cx="36.5" cy="48.5" r="1.5" fill="#FFFFFF" />
      
      <circle cx="65" cy="50" r="4.5" fill="#334155" />
      <circle cx="66.5" cy="48.5" r="1.5" fill="#FFFFFF" />
      
      <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="#F472B6" />

      {/* Yellow 3D Star Sparkle */}
      <g transform="translate(-2, 0)">
        {/* Star Thickness */}
        <path d="M25 6 Q 25 16 15 16 Q 25 16 25 26 Q 25 16 35 16 Q 25 16 25 6 Z" fill="#CA8A04" />
        {/* Star Front */}
        <path d="M25 4 Q 25 14 15 14 Q 25 14 25 24 Q 25 14 35 14 Q 25 14 25 4 Z" fill="url(#starGradCat)" />
      </g>
    </svg>
  );
}

// 14. DefaultDogAvatar - Minimalist 3D Sticker Style
export function DefaultDogAvatar({ width = "100%", height = "100%", className = '' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ease-out hover:scale-[1.05] ${className}`}
    >
      <defs>
        <linearGradient id="dogHeadGrad" x1="50" y1="30" x2="50" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
        <linearGradient id="dogSnoutGrad" x1="50" y1="52" x2="50" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFEDD5" />
        </linearGradient>
        <linearGradient id="starGradDog" x1="15" y1="4" x2="35" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>

      {/* Floor Shadow */}
      <ellipse cx="50" cy="85" rx="30" ry="6" fill="#000000" fillOpacity="0.1" />

      {/* Ears Thickness (Back) */}
      <rect x="16" y="40" width="18" height="34" rx="9" fill="#C2410C" />
      <rect x="66" y="40" width="18" height="34" rx="9" fill="#C2410C" />

      {/* Ears Front */}
      <rect x="16" y="36" width="18" height="34" rx="9" fill="#EA580C" />
      <rect x="66" y="36" width="18" height="34" rx="9" fill="#EA580C" />

      {/* Head Thickness (Back) */}
      <rect x="25" y="34" width="50" height="48" rx="24" fill="#F97316" />
      
      {/* Head Front */}
      <rect x="25" y="30" width="50" height="48" rx="24" fill="url(#dogHeadGrad)" />

      {/* Snout Thickness */}
      <ellipse cx="50" cy="65" rx="15" ry="11" fill="#FED7AA" />
      {/* Snout Front */}
      <ellipse cx="50" cy="62" rx="15" ry="11" fill="url(#dogSnoutGrad)" />

      {/* Face (Minimal) */}
      <circle cx="38" cy="46" r="4.5" fill="#431407" />
      <circle cx="39.5" cy="44.5" r="1.5" fill="#FFFFFF" />
      
      <circle cx="62" cy="46" r="4.5" fill="#431407" />
      <circle cx="63.5" cy="44.5" r="1.5" fill="#FFFFFF" />
      
      <ellipse cx="50" cy="58" rx="5.5" ry="3.5" fill="#431407" />

      {/* Yellow 3D Star Sparkle (on the right) */}
      <g transform="translate(48, 0)">
        {/* Star Thickness */}
        <path d="M25 6 Q 25 16 15 16 Q 25 16 25 26 Q 25 16 35 16 Q 25 16 25 6 Z" fill="#CA8A04" />
        {/* Star Front */}
        <path d="M25 4 Q 25 14 15 14 Q 25 14 25 24 Q 25 14 35 14 Q 25 14 25 4 Z" fill="url(#starGradDog)" />
      </g>
    </svg>
  );
}

export const PetIcons: Record<CategoryKey, {
  icon: (props: { size?: number }) => React.JSX.Element
  subIcons: Record<string, () => React.JSX.Element>
}> = {
  asi: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="asiGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA"/>
            <stop offset="100%" stopColor="#06B6D4"/>
          </linearGradient>
          <filter id="asiShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Şırınga gövdesi */}
        <rect x="10" y="20" width="28" height="8"
          rx="4" fill="url(#asiGrad)"
          filter="url(#asiShadow)"/>
        {/* İğne ucu */}
        <rect x="36" y="22" width="8" height="4"
          rx="2" fill="#93C5FD"/>
        {/* Piston */}
        <rect x="6" y="21" width="6" height="6"
          rx="1" fill="#BFDBFE"/>
        {/* İlaç bölümü */}
        <rect x="16" y="22" width="12" height="4"
          rx="2" fill="white" fillOpacity="0.4"/>
      </svg>
    ),
    subIcons: {
      'Karma Aşı': () => <svg></svg>,
      'Kuduz':     () => <svg></svg>,
    }
  },

  beslenme: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="besGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FCD34D"/>
            <stop offset="100%" stopColor="#F97316"/>
          </linearGradient>
          <filter id="besShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Mama kabı dış */}
        <ellipse cx="24" cy="32" rx="16" ry="6"
          fill="url(#besGrad)" filter="url(#besShadow)"/>
        {/* Mama kabı iç */}
        <ellipse cx="24" cy="30" rx="12" ry="4"
          fill="#FDE68A"/>
        {/* Mama granülleri */}
        <circle cx="20" cy="29" r="2" fill="#F59E0B"/>
        <circle cx="24" cy="28" r="2" fill="#F59E0B"/>
        <circle cx="28" cy="29" r="2" fill="#F59E0B"/>
        {/* Buhar */}
        <path d="M18 22 Q19 18 18 14" stroke="#FCD34D"
          strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M24 20 Q25 16 24 12" stroke="#FCD34D"
          strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    subIcons: {}
  },

  bakim: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="bakGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F472B6"/>
            <stop offset="100%" stopColor="#FB7185"/>
          </linearGradient>
          <filter id="bakShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Makas gövdesi */}
        <line x1="14" y1="14" x2="34" y2="34"
          stroke="url(#bakGrad)" strokeWidth="4"
          strokeLinecap="round" filter="url(#bakShadow)"/>
        <line x1="34" y1="14" x2="14" y2="34"
          stroke="url(#bakGrad)" strokeWidth="4"
          strokeLinecap="round"/>
        {/* Makas halkaları */}
        <circle cx="12" cy="12" r="5"
          fill="none" stroke="url(#bakGrad)" strokeWidth="3"/>
        <circle cx="36" cy="12" r="5"
          fill="none" stroke="url(#bakGrad)" strokeWidth="3"/>
      </svg>
    ),
    subIcons: {}
  },

  aktivite: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="aktGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FB923C"/>
            <stop offset="100%" stopColor="#EF4444"/>
          </linearGradient>
          <filter id="aktShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Kemik yatay gövde */}
        <rect x="12" y="21" width="24" height="6"
          rx="3" fill="url(#aktGrad)"
          filter="url(#aktShadow)"/>
        {/* Sol üst top */}
        <circle cx="13" cy="16" r="5" fill="url(#aktGrad)"/>
        {/* Sol alt top */}
        <circle cx="13" cy="32" r="5" fill="url(#aktGrad)"/>
        {/* Sağ üst top */}
        <circle cx="35" cy="16" r="5" fill="url(#aktGrad)"/>
        {/* Sağ alt top */}
        <circle cx="35" cy="32" r="5" fill="url(#aktGrad)"/>
        {/* Parlama */}
        <ellipse cx="20" cy="19" rx="4" ry="2"
          fill="white" fillOpacity="0.25" transform="rotate(-30 20 19)"/>
      </svg>
    ),
    subIcons: {}
  },

  parazit: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="parGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4ADE80"/>
            <stop offset="100%" stopColor="#10B981"/>
          </linearGradient>
          <filter id="parShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Kalkan */}
        <path d="M24 6 L38 12 L38 26
                 C38 34 24 42 24 42
                 C24 42 10 34 10 26
                 L10 12 Z"
          fill="url(#parGrad)" filter="url(#parShadow)"/>
        {/* Tik işareti */}
        <path d="M17 24 L22 29 L31 18"
          stroke="white" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          fill="none"/>
      </svg>
    ),
    subIcons: {}
  },

  hijyen: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="hijGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8"/>
            <stop offset="100%" stopColor="#6366F1"/>
          </linearGradient>
          <filter id="hijShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Diş fırçası sapı */}
        <rect x="20" y="8" width="8" height="26"
          rx="4" fill="url(#hijGrad)"
          filter="url(#hijShadow)"/>
        {/* Fırça baş */}
        <rect x="16" y="30" width="16" height="10"
          rx="4" fill="#BAE6FD"/>
        {/* Kıl demetleri */}
        <line x1="20" y1="32" x2="20" y2="38"
          stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="24" y1="32" x2="24" y2="38"
          stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="28" y1="32" x2="28" y2="38"
          stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    subIcons: {}
  },

  saglik: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="sagGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F87171"/>
            <stop offset="100%" stopColor="#E11D48"/>
          </linearGradient>
          <filter id="sagShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Artı işareti — sağlık */}
        <rect x="20" y="10" width="8" height="28"
          rx="4" fill="url(#sagGrad)"
          filter="url(#sagShadow)"/>
        <rect x="10" y="20" width="28" height="8"
          rx="4" fill="url(#sagGrad)"/>
        {/* Parlama */}
        <ellipse cx="22" cy="16" rx="2" ry="4"
          fill="white" fillOpacity="0.3"/>
      </svg>
    ),
    subIcons: {}
  },

  kontrol: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="konGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7209B7"/>
            <stop offset="100%" stopColor="#3F37C9"/>
          </linearGradient>
          <filter id="konShadow">
            <feDropShadow dx="0" dy="2"
              stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        {/* Taşıma kafesi gövdesi */}
        <rect x="8" y="14" width="32" height="26" rx="5"
          fill="url(#konGrad)" filter="url(#konShadow)"/>
        {/* Tutma sapı */}
        <path d="M17 14V9C17 7.3 18.3 6 20 6H28C29.7 6 31 7.3 31 9V14"
          stroke="#5B21B6" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* Kapı ızgarası */}
        <rect x="13" y="18" width="18" height="16" rx="2" fill="#FEE440" fillOpacity="0.9"/>
        <line x1="16" y1="18" x2="16" y2="34" stroke="#4F3800" strokeWidth="1.2" strokeOpacity="0.3"/>
        <line x1="20" y1="18" x2="20" y2="34" stroke="#4F3800" strokeWidth="1.2" strokeOpacity="0.3"/>
        <line x1="24" y1="18" x2="24" y2="34" stroke="#4F3800" strokeWidth="1.2" strokeOpacity="0.3"/>
        <line x1="28" y1="18" x2="28" y2="34" stroke="#4F3800" strokeWidth="1.2" strokeOpacity="0.3"/>
      </svg>
    ),
    subIcons: {}
  },

  ilac: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="ilacGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2DD4BF"/>
            <stop offset="100%" stopColor="#0D9488"/>
          </linearGradient>
          <filter id="ilacShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        <rect x="12" y="16" width="24" height="16" rx="8" fill="url(#ilacGrad)" filter="url(#ilacShadow)"/>
        <line x1="24" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" strokeOpacity="0.5"/>
      </svg>
    ),
    subIcons: {}
  },

  kilo: {
    icon: ({ size = 48 }) => (
      <svg width={size} height={size} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="kiloGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA"/>
            <stop offset="100%" stopColor="#7C3AED"/>
          </linearGradient>
          <filter id="kiloShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
          </filter>
        </defs>
        <rect x="10" y="24" width="28" height="10" rx="3" fill="url(#kiloGrad)" filter="url(#kiloShadow)"/>
        <path d="M14 24 L24 10 L34 24 Z" fill="#8B5CF6"/>
      </svg>
    ),
    subIcons: {}
  },
}
