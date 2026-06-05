'use client'
import { SmartScanner } from '@/components/ui/SmartScanner'

interface VaccineScannerProps {
  onSave: (data: any) => void
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
