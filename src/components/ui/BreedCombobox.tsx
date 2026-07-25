'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'

export interface BreedComboboxProps {
  id?: string
  value: string
  onChange: (breed: string) => void
  breeds: string[]
  popularBreeds?: string[]
  placeholder?: string
  required?: boolean
  className?: string
  'data-testid'?: string
}

export const BreedCombobox: React.FC<BreedComboboxProps> = ({
  id = 'pet-breed-combobox',
  value,
  onChange,
  breeds,
  popularBreeds = [],
  placeholder = 'Irk ara veya listeden seçin...',
  required = false,
  className = '',
  'data-testid': testId = 'pet-breed-select',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Disari tiklandiginda kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Arama sonuclarini filtrele
  const filteredBreeds = useMemo(() => {
    if (!searchTerm.trim()) return breeds
    const query = searchTerm.toLowerCase().trim()
    return breeds.filter((b) => b.toLowerCase().includes(query))
  }, [breeds, searchTerm])

  const handleSelect = (breed: string) => {
    onChange(breed)
    setSearchTerm('')
    setIsOpen(false)
  }

  return (
    <div className={`flex flex-col gap-2.5 w-full relative ${className}`} ref={containerRef}>
      {/* Popüler Irklar (Hızlı Seçim Çipleri) */}
      {popularBreeds.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-text-secondary">Popüler:</span>
          {popularBreeds.map((pop) => {
            const isSelected = value === pop
            return (
              <button
                key={pop}
                type="button"
                onClick={() => handleSelect(pop)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {pop}
              </button>
            )
          })}
        </div>
      )}

      {/* Input / Dropdown Tetikleyici */}
      <div className="relative w-full">
        <input
          id={id}
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={value || placeholder}
          data-testid={testId}
          required={required && !value}
          autoComplete="off"
          className="input-base w-full pr-10 cursor-text font-semibold text-[14px]"
        />

        {/* Arrow / Search Icon */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute inset-y-0 right-0 px-3.5 flex items-center text-text-secondary hover:text-primary transition-colors cursor-pointer"
          tabIndex={-1}
          aria-label="Irk Listesini Aç"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Popover Açılır Liste */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border-main/80 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1.5 animate-fadeIn">
          {filteredBreeds.length === 0 ? (
            <div className="p-3 text-center text-[13px] text-text-secondary font-medium">
              Aramanızla eşleşen ırk bulunamadı. &ldquo;Diğer&rdquo; seçeneğini kullanabilirsiniz.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredBreeds.map((b) => {
                const isSelected = value === b
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleSelect(b)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-primary-soft/50 text-primary font-extrabold'
                        : 'hover:bg-slate-50 text-text-primary'
                    }`}
                  >
                    <span>{b}</span>
                    {isSelected && <span className="text-primary text-[14px]">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
