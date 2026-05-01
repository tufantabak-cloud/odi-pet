import { FOOD_PARTNERS } from './partners';

export function matchPartner(foodBrand: string | null | undefined) {
  if (!foodBrand) return null;
  
  const normalizedBrand = foodBrand.toLowerCase().trim();
  
  for (const partner of FOOD_PARTNERS) {
    if (partner.brands.some(b => b.toLowerCase().trim() === normalizedBrand)) {
      return partner;
    }
  }
  
  return null;
}
