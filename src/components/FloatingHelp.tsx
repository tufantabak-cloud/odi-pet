'use client'

import React from 'react'

export default function FloatingHelp() {
  return (
    <a
      href="/help.html"
      target="_blank"
      rel="noopener noreferrer"
      className="floating-help-btn"
      style={{
        position: 'fixed',
        bottom: '80px', // BottomNav üzerinde kalması için ayarlandı
        right: '16px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: '#534AB7',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        zIndex: 9980, // Layout hiyerarşisinde üstte olması için
        textDecoration: 'none',
        boxShadow: '0 2px 10px rgba(83,74,183,0.45)',
        transition: 'transform 0.2s ease, background-color 0.2s ease'
      }}
      aria-label="Yardım merkezi"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)'
        e.currentTarget.style.backgroundColor = '#433a9f'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.backgroundColor = '#534AB7'
      }}
    >
      <i className="ti ti-help-circle" />
    </a>
  )
}
