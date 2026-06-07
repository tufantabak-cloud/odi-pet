'use client'
import { SmartScanner, ParsedScannerData } from '@/components/ui/SmartScanner'

interface VaccineScannerProps {
  onSave: (data: ParsedScannerData) => void
  onClose: () => void
}

export function VaccineScanner({ onSave, onClose }: VaccineScannerProps) {
  return (
    <SmartScanner
      onSave={onSave}
      onClose={onClose}
    />
  )
}
