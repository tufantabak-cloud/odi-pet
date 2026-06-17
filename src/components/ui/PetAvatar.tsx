import React from 'react';
import Image from 'next/image';

interface PetAvatarProps {
  photoUrl?: string | null;
  petType: 'dog' | 'cat' | 'other';
  name: string;
  size?: number;
}

export function PetAvatar({ photoUrl, petType, name, size = 48 }: PetAvatarProps) {
  if (photoUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="relative rounded-full overflow-hidden shrink-0 border border-black/5 shadow-sm"
      >
        <Image 
          src={photoUrl} 
          alt={name} 
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  // Fallback SVGs based on petType
  if (petType === 'dog') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0 drop-shadow-sm">
        <defs>
          <linearGradient id="dogGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C68642"/>
            <stop offset="100%" stopColor="#A0522D"/>
          </linearGradient>
          <linearGradient id="dogBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDF0D5"/>
            <stop offset="100%" stopColor="#F5D0A9"/>
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle cx="24" cy="24" r="24" fill="url(#dogBg)" />
        {/* Ears */}
        <path d="M12 20 Q8 28 14 34 Q16 30 15 22 Z" fill="#8B4513" />
        <path d="M36 20 Q40 28 34 34 Q32 30 33 22 Z" fill="#8B4513" />
        {/* Head */}
        <circle cx="24" cy="26" r="12" fill="url(#dogGrad)" />
        {/* Snout */}
        <ellipse cx="24" cy="30" rx="6" ry="4" fill="#F5DEB3" />
        <ellipse cx="24" cy="28" rx="2" ry="1.5" fill="#3E2723" />
        {/* Eyes */}
        <circle cx="20" cy="24" r="1.5" fill="#3E2723" />
        <circle cx="28" cy="24" r="1.5" fill="#3E2723" />
      </svg>
    );
  }

  if (petType === 'cat') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0 drop-shadow-sm">
        <defs>
          <linearGradient id="catGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#BDBDBD"/>
            <stop offset="100%" stopColor="#757575"/>
          </linearGradient>
          <linearGradient id="catBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F5F5F5"/>
            <stop offset="100%" stopColor="#E0E0E0"/>
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle cx="24" cy="24" r="24" fill="url(#catBg)" />
        {/* Ears */}
        <polygon points="14,22 12,10 22,18" fill="url(#catGrad)" />
        <polygon points="34,22 36,10 26,18" fill="url(#catGrad)" />
        <polygon points="15,20 14,14 19,18" fill="#F8BBD0" />
        <polygon points="33,20 34,14 29,18" fill="#F8BBD0" />
        {/* Head */}
        <ellipse cx="24" cy="26" rx="12" ry="10" fill="url(#catGrad)" />
        {/* Nose */}
        <polygon points="22,27 26,27 24,29" fill="#F48FB1" />
        {/* Whiskers */}
        <line x1="10" y1="26" x2="18" y2="27" stroke="#424242" strokeWidth="0.5" />
        <line x1="10" y1="28" x2="18" y2="28" stroke="#424242" strokeWidth="0.5" />
        <line x1="38" y1="26" x2="30" y2="27" stroke="#424242" strokeWidth="0.5" />
        <line x1="38" y1="28" x2="30" y2="28" stroke="#424242" strokeWidth="0.5" />
        {/* Eyes */}
        <ellipse cx="19" cy="24" rx="2" ry="3" fill="#FFEE58" />
        <ellipse cx="29" cy="24" rx="2" ry="3" fill="#FFEE58" />
        <circle cx="19" cy="24" r="1" fill="#212121" />
        <circle cx="29" cy="24" r="1" fill="#212121" />
      </svg>
    );
  }

  // Other (Paw Print)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="shrink-0 drop-shadow-sm">
      <defs>
        <linearGradient id="otherGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8C7AE6"/>
          <stop offset="100%" stopColor="#6C5CE7"/>
        </linearGradient>
        <linearGradient id="otherBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F3E5F5"/>
          <stop offset="100%" stopColor="#E1BEE7"/>
        </linearGradient>
      </defs>
      {/* Background Circle */}
      <circle cx="24" cy="24" r="24" fill="url(#otherBg)" />
      {/* Paw Print */}
      <circle cx="24" cy="28" r="8" fill="url(#otherGrad)" />
      <circle cx="15" cy="18" r="4" fill="url(#otherGrad)" />
      <circle cx="24" cy="14" r="4.5" fill="url(#otherGrad)" />
      <circle cx="33" cy="18" r="4" fill="url(#otherGrad)" />
    </svg>
  );
}
