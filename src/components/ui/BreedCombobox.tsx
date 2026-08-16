'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { searchBreeds, normalizeText } from '@/lib/pets/breedsMaster'

export interface BreedComboboxProps {
  id?: string
  value: string
  onChange: (breed: string) => void
  breeds?: string[]
  species?: 'cat' | 'dog' | string
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
  breeds = [],
  species,
  popularBreeds = [],
  placeholder = 'Irk ara veya listeden seçin...',
  required = false,
  className = '',
  'data-testid': testId = 'pet-breed-select',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Dışarı tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Arama sonuçlarını akıllıca ve alfabetik olarak filtrele
  const filteredBreeds = useMemo(() => {
    if (species) {
      const items = searchBreeds(searchTerm, species)
      return items.map((i) => i.name)
    }

    if (!searchTerm.trim()) return [...breeds].sort((a, b) => a.localeCompare(b, 'tr'))
    const queryNorm = normalizeText(searchTerm)
    return breeds
      .filter((b) => normalizeText(b).includes(queryNorm))
      .sort((a, b) => a.localeCompare(b, 'tr'))
  }, [breeds, species, searchTerm])

  const handleSelect = (breed: string) => {
    onChange(breed)
    setSearchTerm('')
    setIsOpen(false)
  }

  return (
    <div className={`flex flex-col gap-2.5 w-full relative ${className}`} ref={containerRef}>
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
              Aramanızla eşleşen ırk bulunamadı. Aramanıza uygun özel ırk adı girebilirsiniz.
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

