'use client'
import { SmartScanner, ParsedScannerData } from '@/components/ui/SmartScanner'

interface VaccineScannerProps {
  onSave: (data: ParsedScannerData) => void
  onClose: () => void
}

export function VaccineScanner({ onSave, onClose }: VaccineScannerProps) {
  return (
    <SmartScanner
      category="asi"
      cropMode="vaccine_row"
      onSave={onSave}
      onClose={onClose}
    />
  )
}
