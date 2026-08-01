'use client';

import React from 'react';
import { IllustrationProps } from '@/types/illustration.types';
import { getIllustration } from '@/lib/illustrations';

const SIZE_MAP = {
  sm: 'w-32 h-24',
  md: 'w-64 h-48',
  lg: 'w-96 h-72',
  xl: 'w-full max-w-2xl h-auto',
};

export const Illustration: React.FC<IllustrationProps> = ({
  id,
  size = 'md',
  className = '',
  lazy = true,
  locale = 'tr',
  altText,
  onLoad,
  onError,
}) => {
  const asset = getIllustration(id);

  if (!asset) {
    console.warn(`[OPOS Illustration] Asset with ID "${id}" not found.`);
    return (
      <div className="w-48 h-36 bg-surface-dim rounded-2xl flex items-center justify-center text-text-muted text-xs font-medium">
        [Illustration: {id}]
      </div>
    );
  }

  const title = altText || asset.title[locale] || asset.name;
  const sizeClass = typeof size === 'string' ? SIZE_MAP[size] : '';
  const customStyle = typeof size === 'number' ? { width: `${size}px`, height: 'auto' } : {};

  return (
    <div 
      className={`relative inline-block transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] ${sizeClass} ${className}`}
      style={customStyle}
    >
      <img
        src={`/${asset.svg_path.replace(/^public\//, '')}`}
        alt={title}
        loading={lazy ? 'lazy' : 'eager'}
        className="w-full h-full object-contain filter drop-shadow-sm transition-all duration-300"
        onLoad={onLoad}
        onError={() => {
          if (onError) onError(new Error(`Failed to load illustration: ${id}`));
        }}
      />
    </div>
  );
};

export default Illustration;
