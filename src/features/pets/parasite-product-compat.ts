// Parazit katalog ürünü ↔ protokol/kayıt uyumluluk kuralları.
//
// Enum alfabeleri iki tablo grubunda farklıdır ve DB'de hizalanmamıştır:
//   parasite_products : application_method 'spot-on' (tire), species 'both' var,
//                       type'ta 'collar' YOK (tasma ürünleri method='collar')
//   parasite_records/protocols : 'spot_on' (alt çizgi), species cat|dog,
//                       parasite_type'ta 'collar' VAR
// Eşleme tek noktada, burada yapılır; fn_validate_parasite_record
// trigger'ına bilinçli olarak taşınmaz.

export interface CatalogProductCompat {
  species: string; // 'dog' | 'cat' | 'both'
  type: string; // 'internal' | 'external' | 'combined'
  application_method: string; // 'oral' | 'spot-on' | 'collar' | 'spray' | 'injection'
  is_active: boolean;
}

/** Ürün yöntemini kayıt/protokol alfabesine çevirir ('spot-on' → 'spot_on'). */
export function normalizeProductMethod(method: string): string {
  return method.trim().toLowerCase().replace(/-/g, '_');
}

export function isProductSpeciesCompatible(productSpecies: string, petSpecies: string): boolean {
  return productSpecies === 'both' || productSpecies === petSpecies;
}

/**
 * Protokol parasite_type ↔ ürün uyumu:
 * - 'collar' protokolü: tasma ürünleri application_method='collar' ile modellenir.
 * - internal/external/combined: ürün tipi birebir eşleşmeli; tasma ürünleri
 *   (method=collar) bu protokollere bağlanamaz — takvimde ayrı satırdır.
 */
export function isProductTypeCompatibleWithProtocol(
  product: Pick<CatalogProductCompat, 'type' | 'application_method'>,
  protocolParasiteType: string
): boolean {
  const productMethod = normalizeProductMethod(product.application_method);
  if (protocolParasiteType === 'collar') {
    return productMethod === 'collar';
  }
  return product.type === protocolParasiteType && productMethod !== 'collar';
}

export type ProductCompatFailure =
  | 'PRODUCT_INACTIVE'
  | 'PRODUCT_SPECIES_MISMATCH'
  | 'PRODUCT_TYPE_MISMATCH'
  | 'PRODUCT_METHOD_NOT_ALLOWED'
  | 'PRODUCT_METHOD_MISMATCH';

/** Kayıt oluşturulurken seçilen katalog ürününün tam doğrulaması. */
export function validateProductForRecord(args: {
  product: CatalogProductCompat;
  petSpecies: string;
  protocolParasiteType: string;
  protocolAllowedMethods: string[];
  recordApplicationMethod: string;
}): ProductCompatFailure | null {
  const { product, petSpecies, protocolParasiteType, protocolAllowedMethods, recordApplicationMethod } = args;

  if (!product.is_active) return 'PRODUCT_INACTIVE';
  if (!isProductSpeciesCompatible(product.species, petSpecies)) return 'PRODUCT_SPECIES_MISMATCH';
  if (!isProductTypeCompatibleWithProtocol(product, protocolParasiteType)) return 'PRODUCT_TYPE_MISMATCH';

  const productMethod = normalizeProductMethod(product.application_method);
  if (!protocolAllowedMethods.includes(productMethod)) return 'PRODUCT_METHOD_NOT_ALLOWED';
  if (productMethod !== recordApplicationMethod) return 'PRODUCT_METHOD_MISMATCH';

  return null;
}
