export type { Database } from '../lib/database.types';

// Odi.Pet Common Frontend Types
export interface PetDetails {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  weight?: number;
  is_neutered?: boolean;
}
