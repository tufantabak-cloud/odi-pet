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

  if (displayName) {
    // Parazit ise alt kategori ile birlikte göster: İç Parazit (Caniverm Tablet) gibi
    if (category === 'parazit' || subType.toLowerCase().includes('parazit')) {
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
 * Ham sistem kategorilerini kullanıcı dostu Türkçe etiketlere dönüştürür.
 */
export function getPlanDisplayCategory(category: string, subCategory?: string | null): string {
  const catLower = (category || '').toLowerCase();
  const subLower = (subCategory || '').toLowerCase();

  // Parazit kontrolü (Medikal olup da parazit olanlar veya doğrudan parazit olanlar)
  if (catLower === 'parazit' || subLower.includes('parazit') || subLower.includes('tasma')) {
    return 'Parazit Koruması';
  }

  // Aşı kontrolü
  if (catLower === 'asi' || catLower === 'medikal') {
    return 'Aşı Takibi';
  }

  // Diğer standart eşleştirmeler
  const mapping: Record<string, string> = {
    'saglik': 'Sağlık Takibi',
    'bakim': 'Bakım Rutini',
    'beslenme': 'Beslenme Planı',
    'hijyen': 'Hijyen Takibi',
    'aktivite': 'Aktivite',
    'aktiviteler': 'Aktivite',
    'veteriner': 'Veteriner Randevusu',
    'diger': 'Diğer',
  };

  const key = Object.keys(mapping).find(k => k === catLower);
  return key ? mapping[key] : (category || 'Plan');
}
