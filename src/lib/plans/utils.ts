export interface PlanLike {
  category: string;
  sub_type?: string | null;
  sub_category?: string | null;
  extra_data?: any;
}

/**
 * Plan veya schedule nesnesi için arayüzde gösterilecek en spesifik başlığı üretir.
 */
export function getPlanDisplayTitle(plan: PlanLike): string {
  const category = (plan.category || '').toLowerCase();
  const subType = plan.sub_type || plan.sub_category || '';
  // Aşı adı veya Parazit ürün adı (Marka + Ürün Adı tekrarı önlenerek)
  const vaccineName = plan.extra_data?.vaccine?.name || '';
  let productName = '';
  
  if (plan.extra_data?.product) {
    const brand = plan.extra_data.product.brand_name || '';
    const name = plan.extra_data.product.product_name || '';
    if (name) {
      if (brand && name.toLowerCase().includes(brand.toLowerCase())) {
        productName = name;
      } else {
        productName = brand ? `${brand} ${name}` : name;
      }
    } else {
      productName = brand;
    }
  }

  const displayName = vaccineName || productName;
  
  // İlaç kaydı: medication.name varsa göster, yoksa anlamlı fallback
  const isMedicationPlan = plan.extra_data?.record_type === 'medication' || subType === 'İlaç Kullanımı';
  if (isMedicationPlan) {
    const medName = plan.extra_data?.medication?.name?.trim();
    return medName || 'Belirtilmemiş İlaç';
  }

  if (displayName) {
    if (category === 'parazit' || subType.toLowerCase().includes('parazit')) {
      if (subType.toLowerCase().trim() === displayName.toLowerCase().trim()) {
        return subType;
      }
      return `${subType} (${displayName})`;
    }
    // Aşı ise doğrudan aşı adını göster
    if (category === 'asi' || category === 'medikal') {
      return displayName;
    }
  }

  return subType || 'Plan';
}

/**
 * Ham sistem kategorilerini (asi, parazit, saglik, kontrol, bakim, beslenme, hijyen, aktivite)
 * standart Türkçe arayüz etiketlerine dönüştürür.
 */
export function getCategoryLabel(categoryKey: string): string {
  if (!categoryKey) return '';
  const catLower = categoryKey.toLowerCase().trim();

  switch (catLower) {
    case 'asi':
    case 'aşı':
      return 'Aşı';
    case 'parazit':
      return 'Parazit';
    case 'saglik':
    case 'sağlık':
      return 'Sağlık';
    case 'kontrol':
    case 'randevu':
    case 'veteriner':
      return 'Kontrol & Randevu';
    case 'bakim':
    case 'bakım':
      return 'Bakım';
    case 'beslenme':
      return 'Beslenme';
    case 'hijyen':
    case 'temizlik':
      return 'Hijyen';
    case 'aktivite':
    case 'aktiviteler':
      return 'Aktivite';
    default:
      return categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
  }
}

/**
 * Ham sistem kategorilerini kullanıcı dostu Türkçe etiketlere dönüştürür.
 */
export function getPlanDisplayCategory(category: string, subCategory?: string | null): string {
  const catLower = (category || '').toLowerCase();
  const subLower = (subCategory || '').toLowerCase();

  // Parazit kontrolü (Medikal olup da parazit olanlar veya doğrudan parazit olanlar)
  if (catLower === 'parazit' || subLower.includes('parazit') || subLower.includes('tasma')) {
    return 'Parazit';
  }

  // Aşı kontrolü
  if (catLower === 'asi' || catLower === 'medikal') {
    return 'Aşı';
  }

  return getCategoryLabel(category);
}
