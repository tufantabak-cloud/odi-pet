export interface QuickUpdateField {
  name: string
  type: string
  label: string
  placeholder?: string
  required?: boolean
}

export interface QuickUpdateConfig {
  title: string
  desc: string
  endpoint?: string
  method?: string
  fields: QuickUpdateField[]
}

export interface QuickUpdateModalProps {
  petId: string
  config: QuickUpdateConfig
  onClose: () => void
  onDone: () => void
}

export interface AIVetPet {
  id: string
  name: string
  species: string
  breed: string | null
  gender: string | null
  birth_date: string
  vet_name: string | null
  vet_phone: string | null
  vaccines: string[]
  diseases: string[]
}
