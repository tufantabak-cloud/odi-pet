import { describe, it, expect } from 'vitest';
import {
  normalizeProductMethod,
  isProductSpeciesCompatible,
  isProductTypeCompatibleWithProtocol,
  validateProductForRecord,
} from './parasite-product-compat';

describe('normalizeProductMethod', () => {
  it("'spot-on' → 'spot_on'", () => {
    expect(normalizeProductMethod('spot-on')).toBe('spot_on');
  });
  it('boşluk ve büyük harfe dayanıklı', () => {
    expect(normalizeProductMethod(' Spot-On ')).toBe('spot_on');
  });
  it('tiresiz yöntemler değişmez', () => {
    expect(normalizeProductMethod('oral')).toBe('oral');
    expect(normalizeProductMethod('collar')).toBe('collar');
  });
});

describe('isProductSpeciesCompatible', () => {
  it("'both' her türle uyumlu", () => {
    expect(isProductSpeciesCompatible('both', 'dog')).toBe(true);
    expect(isProductSpeciesCompatible('both', 'cat')).toBe(true);
  });
  it('birebir eşleşme uyumlu', () => {
    expect(isProductSpeciesCompatible('dog', 'dog')).toBe(true);
  });
  it('çapraz tür uyumsuz', () => {
    expect(isProductSpeciesCompatible('dog', 'cat')).toBe(false);
  });
});

describe('isProductTypeCompatibleWithProtocol', () => {
  it("collar protokolü: method='collar' ürün uyumlu (Seresto deseni: type external + method collar)", () => {
    expect(
      isProductTypeCompatibleWithProtocol({ type: 'external', application_method: 'collar' }, 'collar')
    ).toBe(true);
  });
  it('collar protokolü: spot-on ürün uyumsuz', () => {
    expect(
      isProductTypeCompatibleWithProtocol({ type: 'external', application_method: 'spot-on' }, 'collar')
    ).toBe(false);
  });
  it('external protokolü: tasma ürünü (method=collar) uyumsuz — tasma ayrı satırdır', () => {
    expect(
      isProductTypeCompatibleWithProtocol({ type: 'external', application_method: 'collar' }, 'external')
    ).toBe(false);
  });
  it('internal ↔ internal uyumlu', () => {
    expect(
      isProductTypeCompatibleWithProtocol({ type: 'internal', application_method: 'oral' }, 'internal')
    ).toBe(true);
  });
  it('combined ↔ combined uyumlu, external ↔ combined uyumsuz', () => {
    expect(
      isProductTypeCompatibleWithProtocol({ type: 'combined', application_method: 'spot-on' }, 'combined')
    ).toBe(true);
    expect(
      isProductTypeCompatibleWithProtocol({ type: 'combined', application_method: 'spot-on' }, 'external')
    ).toBe(false);
  });
});

describe('validateProductForRecord', () => {
  const baseArgs = {
    product: { species: 'dog', type: 'internal', application_method: 'oral', is_active: true },
    petSpecies: 'dog',
    protocolParasiteType: 'internal',
    protocolAllowedMethods: ['oral', 'spot_on'],
    recordApplicationMethod: 'oral',
  };

  it('uyumlu ürün → null (hata yok)', () => {
    expect(validateProductForRecord(baseArgs)).toBeNull();
  });

  it('pasif ürün → PRODUCT_INACTIVE', () => {
    expect(
      validateProductForRecord({ ...baseArgs, product: { ...baseArgs.product, is_active: false } })
    ).toBe('PRODUCT_INACTIVE');
  });

  it('tür uyumsuzluğu → PRODUCT_SPECIES_MISMATCH', () => {
    expect(
      validateProductForRecord({ ...baseArgs, product: { ...baseArgs.product, species: 'cat' } })
    ).toBe('PRODUCT_SPECIES_MISMATCH');
  });

  it('tip uyumsuzluğu → PRODUCT_TYPE_MISMATCH', () => {
    expect(
      validateProductForRecord({ ...baseArgs, product: { ...baseArgs.product, type: 'external' } })
    ).toBe('PRODUCT_TYPE_MISMATCH');
  });

  it('protokolün izin vermediği yöntem → PRODUCT_METHOD_NOT_ALLOWED', () => {
    expect(
      validateProductForRecord({
        ...baseArgs,
        product: { ...baseArgs.product, application_method: 'spot-on' },
        protocolAllowedMethods: ['oral'],
      })
    ).toBe('PRODUCT_METHOD_NOT_ALLOWED');
  });

  it('kayıt yöntemi ürün yönteminden farklı → PRODUCT_METHOD_MISMATCH', () => {
    expect(
      validateProductForRecord({ ...baseArgs, recordApplicationMethod: 'spot_on' })
    ).toBe('PRODUCT_METHOD_MISMATCH');
  });

  it("'spot-on' ürünü 'spot_on' kayıt yöntemiyle eşleşir (enum köprüsü)", () => {
    expect(
      validateProductForRecord({
        ...baseArgs,
        product: { species: 'both', type: 'combined', application_method: 'spot-on', is_active: true },
        protocolParasiteType: 'combined',
        protocolAllowedMethods: ['spot_on'],
        recordApplicationMethod: 'spot_on',
      })
    ).toBeNull();
  });
});
