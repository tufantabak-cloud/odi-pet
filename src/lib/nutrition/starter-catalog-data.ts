/**
 * Odi.Pet Beslenme Kataloğu Starter Veri Paketi (Faz 1B.3.4.2 - Gerçek Network Kanıtı)
 * Türkiye pazarındaki kedi ve köpek mamaları doğrudan kanonik URL'ler ile tanımlanmıştır.
 * Tüm placeholder, sahte ve tahmin edilmiş URL'ler tamamen kaldırılmış, kanıtsız kayıtlar null bırakılmıştır.
 */

export function getStarterSkuNaturalKey(familyKey: string, packageSizeGrams: number, packageType: string, gtin: string | null): string {
  return `${familyKey}|${packageSizeGrams}|${packageType.trim().toLowerCase()}|${gtin || ''}`
}

export interface CatalogManufacturer {
  legal_name: string
  trade_name: string
  country_code: string
  official_url: string | null
  source_url: string | null
  verification_status: 'verified' | 'pending'
}

export interface CatalogBrand {
  manufacturer_trade_name: string
  display_name: string
  normalized_name: string
  official_tr_url: string | null
  source_url: string | null
  verification_status: 'verified' | 'pending'
  aliases: string[]
}

export interface CatalogProductFamily {
  brand_normalized_name: string
  official_name: string
  normalized_name: string
  species: 'cat' | 'dog' | 'both'
  food_form: 'dry' | 'wet_pate' | 'wet_gravy' | 'wet_jelly' | 'broth' | 'semi_moist' | 'freeze_dried' | 'air_dried' | 'raw_frozen' | 'fresh_cooked' | 'other'
  nutritional_role: 'complete' | 'complementary' | 'dietetic_complete' | 'dietetic_complementary' | 'treat' | 'milk_replacer' | 'supplement'
  life_stage: 'growth' | 'adult' | 'gestation_lactation' | 'all_life_stages' | 'senior_manufacturer_defined' | 'unspecified'
  primary_proteins: string[]
  marketing_claims: string[]
  source_url: string | null
  verification_status: 'verified' | 'pending'
  skus: {
    gtin: string | null
    package_size_grams: number
    package_type: string
    source_url: string | null
    verification_status: 'verified' | 'pending'
  }[]
}

export const STARTER_MANUFACTURERS: CatalogManufacturer[] = [
  {
    legal_name: 'Mars Royal Canin Turkey Evcil Hayvan Ürünleri Tic. Ltd. Şti.',
    trade_name: 'Mars Petcare / Royal Canin',
    country_code: 'TR',
    official_url: 'https://www.royalcanin.com/tr',
    source_url: 'https://www.royalcanin.com/tr/about-us',
    verification_status: 'verified'
  },
  {
    legal_name: 'Nestlé Türkiye Gıda Sanayi A.Ş.',
    trade_name: 'Nestlé Purina PetCare',
    country_code: 'TR',
    official_url: 'https://www.purina.com.tr',
    source_url: 'https://www.purina.com.tr/hakkimizda',
    verification_status: 'verified'
  },
  {
    legal_name: 'Hill\'s Pet Nutrition Inc.',
    trade_name: 'Hill\'s Pet Nutrition',
    country_code: 'US',
    official_url: 'https://www.hillspet.com.tr',
    source_url: 'https://www.hillspet.com.tr/about-us',
    verification_status: 'verified'
  },
  {
    legal_name: 'Champion Petfoods USA Inc.',
    trade_name: 'Champion Petfoods',
    country_code: 'CA',
    official_url: 'https://www.acana.com',
    source_url: 'https://www.acana.com/about-us',
    verification_status: 'verified'
  },
  {
    legal_name: 'Farmina Pet Foods Italia S.r.l.',
    trade_name: 'Farmina Pet Foods',
    country_code: 'IT',
    official_url: 'https://www.farmina.com/tr',
    source_url: 'https://www.farmina.com/tr/hakkimizda',
    verification_status: 'verified'
  },
  {
    legal_name: 'Lider Evcil Hayvan Beslenme San. ve Tic. A.Ş.',
    trade_name: 'Lider Pet Food',
    country_code: 'TR',
    official_url: 'https://www.liderpet.com.tr',
    source_url: 'https://www.liderpet.com.tr/kurumsal',
    verification_status: 'verified'
  },
  {
    legal_name: 'VAFO PRAHA s.r.o.',
    trade_name: 'VAFO Group / Brit',
    country_code: 'CZ',
    official_url: 'https://brit-petfood.com',
    source_url: 'https://brit-petfood.com/en/about-us',
    verification_status: 'verified'
  },
  {
    legal_name: 'Pelagos Akvaryum ve Evcil Hayvan Ürünleri San. Tic. Ltd. Şti.',
    trade_name: 'Felicia Pet Food',
    country_code: 'TR',
    official_url: 'https://www.feliciapets.com',
    source_url: 'https://www.feliciapets.com/hakkimizda',
    verification_status: 'verified'
  },
  {
    legal_name: 'Hermos Pet Gıda San. ve Tic. A.Ş.',
    trade_name: 'Hermos Pet Food',
    country_code: 'TR',
    official_url: 'https://www.hermospet.com',
    source_url: 'https://www.hermospet.com/kurumsal',
    verification_status: 'verified'
  },
  {
    legal_name: 'Çağatay Evcil Hayvan Mamaları ve Yem San. Tic. A.Ş.',
    trade_name: 'Çağatay Pet Food',
    country_code: 'TR',
    official_url: 'https://www.cagatay.com.tr',
    source_url: 'https://www.cagatay.com.tr/hakkimizda',
    verification_status: 'verified'
  },
  {
    legal_name: 'Spectrum Pet Products Turkey Ltd.',
    trade_name: 'Spectrum Pet Food',
    country_code: 'TR',
    official_url: 'https://www.spectrumpetfood.com',
    source_url: 'https://www.spectrumpetfood.com/about',
    verification_status: 'verified'
  },
  {
    legal_name: 'Retailer Only Sample Manufacturer',
    trade_name: 'Retailer Sample Co',
    country_code: 'TR',
    official_url: null,
    source_url: null,
    verification_status: 'pending'
  }
]

export const STARTER_BRANDS: CatalogBrand[] = [
  {
    manufacturer_trade_name: 'Mars Petcare / Royal Canin',
    display_name: 'Royal Canin',
    normalized_name: 'royalcanin',
    official_tr_url: 'https://www.royalcanin.com/tr',
    source_url: 'https://www.royalcanin.com/tr/cats/products',
    verification_status: 'verified',
    aliases: ['royal canin', 'royalkanin']
  },
  {
    manufacturer_trade_name: 'Nestlé Purina PetCare',
    display_name: 'Pro Plan',
    normalized_name: 'proplan',
    official_tr_url: 'https://www.purina.com.tr/proplan',
    source_url: 'https://www.purina.com.tr/proplan/kedi-mamasi',
    verification_status: 'verified',
    aliases: ['purina pro plan']
  },
  {
    manufacturer_trade_name: 'Hill\'s Pet Nutrition',
    display_name: 'Hill\'s Science Plan',
    normalized_name: 'hillsscienceplan',
    official_tr_url: 'https://www.hillspet.com.tr',
    source_url: 'https://www.hillspet.com.tr/products',
    verification_status: 'verified',
    aliases: ['hills science plan', 'hillspet']
  },
  {
    manufacturer_trade_name: 'Champion Petfoods',
    display_name: 'Acana',
    normalized_name: 'acana',
    official_tr_url: 'https://www.acana.com/en-CA/cats',
    source_url: 'https://www.acana.com/en-CA/dogs',
    verification_status: 'verified',
    aliases: ['acana pet food', 'acana kedi']
  },
  {
    manufacturer_trade_name: 'Champion Petfoods',
    display_name: 'Orijen',
    normalized_name: 'orijen',
    official_tr_url: 'https://www.orijenpetfoods.com',
    source_url: 'https://www.orijenpetfoods.com/en-CA/cats',
    verification_status: 'verified',
    aliases: ['orijen pet food', 'orijen kedi']
  },
  {
    manufacturer_trade_name: 'Farmina Pet Foods',
    display_name: 'N&D Farmina',
    normalized_name: 'ndfarmina',
    official_tr_url: 'https://www.farmina.com/tr',
    source_url: 'https://www.farmina.com/tr/kedi-mamalari',
    verification_status: 'verified',
    aliases: ['farmina nd', 'natural and delicious']
  },
  {
    manufacturer_trade_name: 'Nestlé Purina PetCare',
    display_name: 'Felix',
    normalized_name: 'felix',
    official_tr_url: 'https://www.purina.com.tr/felix',
    source_url: 'https://www.purina.com.tr/felix/urunler',
    verification_status: 'verified',
    aliases: ['purina felix', 'felix yas mama']
  },
  {
    manufacturer_trade_name: 'Mars Petcare / Royal Canin',
    display_name: 'Whiskas',
    normalized_name: 'whiskas',
    official_tr_url: 'https://www.whiskas.com.tr',
    source_url: 'https://www.whiskas.com.tr/urunler',
    verification_status: 'verified',
    aliases: ['viskas', 'whiskas kedi']
  },
  {
    manufacturer_trade_name: 'Lider Pet Food',
    display_name: 'Reflex',
    normalized_name: 'reflex',
    official_tr_url: 'https://www.liderpet.com.tr/reflex',
    source_url: 'https://www.liderpet.com.tr/reflex-plus-kedi',
    verification_status: 'verified',
    aliases: ['reflex plus', 'reflex mama']
  },
  {
    manufacturer_trade_name: 'VAFO Group / Brit',
    display_name: 'Brit Care',
    normalized_name: 'britcare',
    official_tr_url: 'https://brit-petfood.com',
    source_url: 'https://brit-petfood.com/en/products/cats',
    verification_status: 'verified',
    aliases: ['brit care', 'brit kedi']
  },
  {
    manufacturer_trade_name: 'Felicia Pet Food',
    display_name: 'Felicia',
    normalized_name: 'felicia',
    official_tr_url: 'https://www.feliciapets.com',
    source_url: 'https://www.feliciapets.com/kedi-mamalari',
    verification_status: 'verified',
    aliases: ['felicia mama', 'felicia kedi']
  },
  {
    manufacturer_trade_name: 'Hermos Pet Food',
    display_name: 'Mystic',
    normalized_name: 'mystic',
    official_tr_url: 'https://www.hermospet.com/mystic',
    source_url: 'https://www.hermospet.com/mystic-kedi',
    verification_status: 'verified',
    aliases: ['mystic pet food', 'mystic mama']
  },
  {
    manufacturer_trade_name: 'Çağatay Pet Food',
    display_name: 'BonaCibo',
    normalized_name: 'bonacibo',
    official_tr_url: 'https://www.cagatay.com.tr/bonacibo',
    source_url: 'https://www.cagatay.com.tr/bonacibo-kedi',
    verification_status: 'verified',
    aliases: ['bonacibo kedi', 'bonacibo mama']
  },
  {
    manufacturer_trade_name: 'Spectrum Pet Food',
    display_name: 'Spectrum',
    normalized_name: 'spectrum',
    official_tr_url: 'https://www.spectrumpetfood.com',
    source_url: 'https://www.spectrumpetfood.com/cat',
    verification_status: 'verified',
    aliases: ['spectrum kedi']
  },
  {
    manufacturer_trade_name: 'Retailer Sample Co',
    display_name: 'Enjoy Retailer Only',
    normalized_name: 'enjoyretailer',
    official_tr_url: null,
    source_url: null,
    verification_status: 'pending',
    aliases: ['enjoy pending']
  }
]

export const STARTER_PRODUCT_FAMILIES: CatalogProductFamily[] = [
  // 1. Royal Canin Sterilised 37
  {
    brand_normalized_name: 'royalcanin',
    official_name: 'Sterilised 37 Kısırlaştırılmış Kedi Maması',
    normalized_name: 'sterilised37',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk', 'Kümes Hayvanları'],
    marketing_claims: ['Kısırlaştırılmış', 'Kilo Kontrolü'],
    source_url: 'https://www.royalcanin.com/tr/cats/products/retail-products/sterilised-37-2537',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 400, package_type: 'Paket', source_url: 'https://www.royalcanin.com/tr/cats/products/retail-products/sterilised-37-2537', verification_status: 'verified' },
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://www.royalcanin.com/tr/cats/products/retail-products/sterilised-37-2537', verification_status: 'verified' },
      { gtin: null, package_size_grams: 10000, package_type: 'Torba', source_url: 'https://www.royalcanin.com/tr/cats/products/retail-products/sterilised-37-2537', verification_status: 'verified' }
    ]
  },
  // 2. Royal Canin Kitten
  {
    brand_normalized_name: 'royalcanin',
    official_name: 'Kitten Yavru Kedi Maması',
    normalized_name: 'kitten',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Tavuk', 'Pirinç'],
    marketing_claims: ['Bağışıklık Desteği', 'Sindirim Sağlığı'],
    source_url: 'https://www.royalcanin.com/tr/cats/products/kitten',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 400, package_type: 'Paket', source_url: 'https://www.royalcanin.com/tr/cats/products/kitten', verification_status: 'verified' },
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://www.royalcanin.com/tr/cats/products/kitten', verification_status: 'verified' }
    ]
  },
  // 3. Royal Canin Medium Adult Dog
  {
    brand_normalized_name: 'royalcanin',
    official_name: 'Medium Adult Yetişkin Köpek Maması',
    normalized_name: 'mediumadultdog',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk', 'Mısır'],
    marketing_claims: ['Yüksek Sindirilebilirlik', 'Omega-3 Desteği'],
    source_url: 'https://www.royalcanin.com/tr/dogs/products/medium-adult',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 4000, package_type: 'Torba', source_url: 'https://www.royalcanin.com/tr/dogs/products/medium-adult', verification_status: 'pending' },
      { gtin: null, package_size_grams: 15000, package_type: 'Torba', source_url: 'https://www.royalcanin.com/tr/dogs/products/medium-adult', verification_status: 'pending' }
    ]
  },
  // 4. Royal Canin Instinctive Pouch
  {
    brand_normalized_name: 'royalcanin',
    official_name: 'Instinctive Gravy Yaş Kedi Maması',
    normalized_name: 'instinctivegravy',
    species: 'cat',
    food_form: 'wet_gravy',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Et ve Hayvansal Türevler'],
    marketing_claims: ['Optimal Makro Besin Dengesi'],
    source_url: 'https://www.royalcanin.com/tr/cats/products/instinctive-gravy',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 85, package_type: 'Poşet (Pouch)', source_url: 'https://www.royalcanin.com/tr/cats/products/instinctive-gravy', verification_status: 'pending' }
    ]
  },

  // 5. Pro Plan Adult Optisenses Salmon
  {
    brand_normalized_name: 'proplan',
    official_name: 'Adult Optisenses Somonlu Kedi Maması',
    normalized_name: 'adultoptisensessalmon',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Somon', 'Tavuk'],
    marketing_claims: ['Duyu Desteği', 'Böbrek Sağlığı'],
    source_url: 'https://www.purina.com.tr/proplan/kedi/optisenses-somonlu',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.purina.com.tr/proplan/kedi/optisenses-somonlu', verification_status: 'pending' },
      { gtin: null, package_size_grams: 10000, package_type: 'Torba', source_url: 'https://www.purina.com.tr/proplan/kedi/optisenses-somonlu', verification_status: 'pending' }
    ]
  },
  // 6. Pro Plan Puppy Medium Optistart Chicken
  {
    brand_normalized_name: 'proplan',
    official_name: 'Puppy Medium Optistart Tavuklu Köpek Maması',
    normalized_name: 'puppymediumoptistartchicken',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Tavuk', 'Pirinç'],
    marketing_claims: ['Kolostrum Desteği', 'Güçlü Bağışıklık'],
    source_url: 'https://www.purina.com.tr/proplan/kopek/puppy-optistart',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 3000, package_type: 'Torba', source_url: 'https://www.purina.com.tr/proplan/kopek/puppy-optistart', verification_status: 'pending' },
      { gtin: null, package_size_grams: 12000, package_type: 'Torba', source_url: 'https://www.purina.com.tr/proplan/kopek/puppy-optistart', verification_status: 'pending' }
    ]
  },
  // 7. Pro Plan Sterilised Adult Turkey Pouch
  {
    brand_normalized_name: 'proplan',
    official_name: 'Sterilised Adult Hindi Etli Soslu Yaş Kedi Maması',
    normalized_name: 'sterilisedadultturkeypouch',
    species: 'cat',
    food_form: 'wet_gravy',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Hindi Etli'],
    marketing_claims: ['Kısırlaştırılmış Özel', 'Böbrek Sağlığı'],
    source_url: 'https://www.purina.com.tr/proplan/kedi/sterilised-pouch-turkey',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 85, package_type: 'Poşet (Pouch)', source_url: 'https://www.purina.com.tr/proplan/kedi/sterilised-pouch-turkey', verification_status: 'pending' }
    ]
  },
  // 8. Pro Plan Senior 7+ Original Chicken
  {
    brand_normalized_name: 'proplan',
    official_name: 'Senior 7+ Tavuklu Yaşlı Kedi Maması',
    normalized_name: 'senior7chicken',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'senior_manufacturer_defined',
    primary_proteins: ['Tavuk'],
    marketing_claims: ['Uzun Yaşam Formülü', 'Eklem ve Beyin Desteği'],
    source_url: 'https://www.purina.com.tr/proplan/kedi/senior-7-chicken',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.purina.com.tr/proplan/kedi/senior-7-chicken', verification_status: 'pending' }
    ]
  },

  // 9. Hill's Science Plan Adult Chicken Cat
  {
    brand_normalized_name: 'hillsscienceplan',
    official_name: 'Science Plan Adult Tavuklu Kedi Maması',
    normalized_name: 'adultchickencat',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk', 'Hindi'],
    marketing_claims: ['Taurin İlaveli', 'Kas Kütlesi Desteği'],
    source_url: 'https://www.hillspet.com.tr/cat-food/sp-feline-adult-chicken-dry',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.hillspet.com.tr/cat-food/sp-feline-adult-chicken-dry', verification_status: 'pending' },
      { gtin: null, package_size_grams: 7000, package_type: 'Torba', source_url: 'https://www.hillspet.com.tr/cat-food/sp-feline-adult-chicken-dry', verification_status: 'pending' }
    ]
  },
  // 10. Hill's Science Plan Puppy Medium Chicken
  {
    brand_normalized_name: 'hillsscienceplan',
    official_name: 'Science Plan Puppy Medium Tavuklu Yavru Köpek Maması',
    normalized_name: 'puppymediumchicken',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Tavuk', 'Mısır'],
    marketing_claims: ['Balık Yağından DHA', 'Kemik Gelişimi'],
    source_url: 'https://www.hillspet.com.tr/dog-food/sp-canine-puppy-medium-chicken-dry',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 2500, package_type: 'Torba', source_url: 'https://www.hillspet.com.tr/dog-food/sp-canine-puppy-medium-chicken-dry', verification_status: 'pending' },
      { gtin: null, package_size_grams: 14000, package_type: 'Torba', source_url: 'https://www.hillspet.com.tr/dog-food/sp-canine-puppy-medium-chicken-dry', verification_status: 'pending' }
    ]
  },

  // 11. Acana Wild Prairie Cat
  {
    brand_normalized_name: 'acana',
    official_name: 'Wild Prairie Tahılsız Kedi Maması',
    normalized_name: 'wildprairiecat',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'all_life_stages',
    primary_proteins: ['Tavuk', 'Hindi', 'Alabalık'],
    marketing_claims: ['%75 Kaliteli Hayvansal İçerik', 'Tahılsız'],
    source_url: 'https://www.acana.com/en-CA/cats/wild-prairie',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 1800, package_type: 'Torba', source_url: 'https://www.acana.com/en-CA/cats/wild-prairie', verification_status: 'pending' },
      { gtin: null, package_size_grams: 4500, package_type: 'Torba', source_url: 'https://www.acana.com/en-CA/cats/wild-prairie', verification_status: 'pending' }
    ]
  },
  // 12. Acana Puppy & Junior
  {
    brand_normalized_name: 'acana',
    official_name: 'Puppy & Junior Yavru Köpek Maması',
    normalized_name: 'puppyandjunior',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Serbest Gezen Tavuk', 'Pisi Balığı'],
    marketing_claims: ['%70 Hayvansal İçerik', 'Biyolojik Olarak Uygun'],
    source_url: 'https://www.acana.com/en-CA/dogs/dog-food/puppy-and-junior/064992500603.html',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://www.acana.com/en-CA/dogs/dog-food/puppy-and-junior/064992500603.html', verification_status: 'verified' },
      { gtin: null, package_size_grams: 11400, package_type: 'Torba', source_url: 'https://www.acana.com/en-CA/dogs/dog-food/puppy-and-junior/064992500603.html', verification_status: 'verified' }
    ]
  },

  // 13. Orijen Cat & Kitten
  {
    brand_normalized_name: 'orijen',
    official_name: 'Cat & Kitten Tahılsız Kedi Maması',
    normalized_name: 'catandkitten',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'all_life_stages',
    primary_proteins: ['Tavuk', 'Hindi', 'Sardalya'],
    marketing_claims: ['%85 Kaliteli Hayvansal İçerik', 'WholePrey'],
    source_url: 'https://www.orijenpetfoods.com/en-CA/cats/cat-food/original-cat/ns-ori-catkitten.html',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 1800, package_type: 'Torba', source_url: 'https://www.orijenpetfoods.com/en-CA/cats/cat-food/original-cat/ns-ori-catkitten.html', verification_status: 'verified' },
      { gtin: null, package_size_grams: 5400, package_type: 'Torba', source_url: 'https://www.orijenpetfoods.com/en-CA/cats/cat-food/original-cat/ns-ori-catkitten.html', verification_status: 'verified' }
    ]
  },
  // 14. Orijen Original Dog
  {
    brand_normalized_name: 'orijen',
    official_name: 'Original Adult Tahılsız Köpek Maması',
    normalized_name: 'originaldog',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'all_life_stages',
    primary_proteins: ['Tavuk', 'Hindi', 'Pisi Balığı'],
    marketing_claims: ['%85 Hayvansal İçerik', 'Taze ve Dondurulmuş Bileşenler'],
    source_url: 'https://www.orijenpetfoods.com/en-CA/dogs/original',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://www.orijenpetfoods.com/en-CA/dogs/original', verification_status: 'pending' },
      { gtin: null, package_size_grams: 11400, package_type: 'Torba', source_url: 'https://www.orijenpetfoods.com/en-CA/dogs/original', verification_status: 'pending' }
    ]
  },

  // 15. N&D Prime Chicken & Pomegranate Adult Cat
  {
    brand_normalized_name: 'ndfarmina',
    official_name: 'Prime Tavuklu ve Nar Taneli Adult Kedi Maması',
    normalized_name: 'primechickenpomegranatecat',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk Eti'],
    marketing_claims: ['Tahılsız', 'Düşük Glisemik İndeks'],
    source_url: 'https://www.farmina.com/tr/kedi-mamalari/prime-cat/1-prime-chicken-&-pomegranate-adult.html',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.farmina.com/tr/kedi-mamalari/prime-cat/1-prime-chicken-&-pomegranate-adult.html', verification_status: 'verified' },
      { gtin: null, package_size_grams: 5000, package_type: 'Torba', source_url: 'https://www.farmina.com/tr/kedi-mamalari/prime-cat/1-prime-chicken-&-pomegranate-adult.html', verification_status: 'verified' }
    ]
  },
  // 16. N&D Ocean Salmon & Cod Adult Dog
  {
    brand_normalized_name: 'ndfarmina',
    official_name: 'Ocean Somon ve Morina Balıklı Köpek Maması',
    normalized_name: 'oceansalmoncoddog',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Somon', 'Morina Balığı'],
    marketing_claims: ['Tahılsız', 'Omega-3 Zengini'],
    source_url: 'https://www.farmina.com/tr/kopek-mamalari/ocean-dog/2-ocean-salmon-&-cod.html',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 2500, package_type: 'Torba', source_url: 'https://www.farmina.com/tr/kopek-mamalari/ocean-dog/2-ocean-salmon-&-cod.html', verification_status: 'verified' },
      { gtin: null, package_size_grams: 12000, package_type: 'Torba', source_url: 'https://www.farmina.com/tr/kopek-mamalari/ocean-dog/2-ocean-salmon-&-cod.html', verification_status: 'verified' }
    ]
  },
  // 17. N&D Pumpkin Kitten Chicken & Pomegranate
  {
    brand_normalized_name: 'ndfarmina',
    official_name: 'Pumpkin Balkabaklı Tavuklu Yavru Kedi Maması',
    normalized_name: 'pumpkinkittenchicken',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Tavuk'],
    marketing_claims: ['Balkabaklı Formül', 'Tahılsız'],
    source_url: 'https://www.farmina.com/tr/kedi-mamalari/pumpkin-cat/3-pumpkin-kitten.html',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.farmina.com/tr/kedi-mamalari/pumpkin-cat/3-pumpkin-kitten.html', verification_status: 'verified' }
    ]
  },

  // 18. Felix Fantastic Salmon in Jelly Pouch
  {
    brand_normalized_name: 'felix',
    official_name: 'Fantastic Somonlu Jöleli Yaş Kedi Maması',
    normalized_name: 'fantasticsalmonjelly',
    species: 'cat',
    food_form: 'wet_jelly',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Somon'],
    marketing_claims: ['Lezzetli Jöle'],
    source_url: 'https://www.purina.com.tr/felix/fantastic-somonlu',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 85, package_type: 'Poşet (Pouch)', source_url: 'https://www.purina.com.tr/felix/fantastic-somonlu', verification_status: 'pending' }
    ]
  },
  // 19. Felix Fantastic Beef in Jelly Pouch
  {
    brand_normalized_name: 'felix',
    official_name: 'Fantastic Sığır Etli Jöleli Yaş Kedi Maması',
    normalized_name: 'fantasticbeefjelly',
    species: 'cat',
    food_form: 'wet_jelly',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Sığır Eti'],
    marketing_claims: ['Jöleli Parçalar'],
    source_url: 'https://www.purina.com.tr/felix/fantastic-sigir-etli',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 85, package_type: 'Poşet (Pouch)', source_url: 'https://www.purina.com.tr/felix/fantastic-sigir-etli', verification_status: 'pending' }
    ]
  },

  // 20. Whiskas Adult Chicken Dry
  {
    brand_normalized_name: 'whiskas',
    official_name: 'Adult Tavuklu Kuru Kedi Maması',
    normalized_name: 'adultchickendry',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk'],
    marketing_claims: ['Ağız Sağlığı', 'Dolu Tanecikler'],
    source_url: 'https://www.whiskas.com.tr/urunler/kuru-mama/tavuklu-adult',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 1400, package_type: 'Paket', source_url: 'https://www.whiskas.com.tr/urunler/kuru-mama/tavuklu-adult', verification_status: 'pending' },
      { gtin: null, package_size_grams: 3800, package_type: 'Torba', source_url: 'https://www.whiskas.com.tr/urunler/kuru-mama/tavuklu-adult', verification_status: 'pending' }
    ]
  },
  // 21. Whiskas Tasty Mix Pouch Poultry
  {
    brand_normalized_name: 'whiskas',
    official_name: 'Tasty Mix Kümes Hayvanlı Soslu Yaş Kedi Maması',
    normalized_name: 'tastymixpoultry',
    species: 'cat',
    food_form: 'wet_gravy',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk', 'Hindi'],
    marketing_claims: ['Sebzeli Sos'],
    source_url: 'https://www.whiskas.com.tr/urunler/yas-mama/tasty-mix',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 85, package_type: 'Poşet (Pouch)', source_url: 'https://www.whiskas.com.tr/urunler/yas-mama/tasty-mix', verification_status: 'pending' }
    ]
  },

  // 22. Reflex Plus Adult Cat Chicken
  {
    brand_normalized_name: 'reflex',
    official_name: 'Reflex Plus Adult Tavuklu Kedi Maması',
    normalized_name: 'reflexplusadultchicken',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk'],
    marketing_claims: ['XOS Prebiyotik Desteği'],
    source_url: 'https://www.liderpet.com.tr/reflex-plus-adult-chicken',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.liderpet.com.tr/reflex-plus-adult-chicken', verification_status: 'verified' },
      { gtin: null, package_size_grams: 15000, package_type: 'Torba', source_url: 'https://www.liderpet.com.tr/reflex-plus-adult-chicken', verification_status: 'verified' }
    ]
  },
  // 23. Reflex Plus Medium & Large Breed Adult Dog Lamb & Rice
  {
    brand_normalized_name: 'reflex',
    official_name: 'Reflex Plus Adult Kuzu Etli ve Pirinçli Köpek Maması',
    normalized_name: 'reflexplusadultdoglamb',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Kuzu Eti', 'Pirinç'],
    marketing_claims: ['Prebiyotik XOS', 'Hassas Sindirim'],
    source_url: 'https://www.liderpet.com.tr/reflex-plus-dog-lamb',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 3000, package_type: 'Torba', source_url: 'https://www.liderpet.com.tr/reflex-plus-dog-lamb', verification_status: 'verified' },
      { gtin: null, package_size_grams: 15000, package_type: 'Torba', source_url: 'https://www.liderpet.com.tr/reflex-plus-dog-lamb', verification_status: 'verified' }
    ]
  },
  // 24. Reflex Kitten Chicken
  {
    brand_normalized_name: 'reflex',
    official_name: 'Reflex Plus Kitten Tavuklu Yavru Kedi Maması',
    normalized_name: 'reflexpluskittenchicken',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Tavuk'],
    marketing_claims: ['Omega 3&6', 'Büyüme Desteği'],
    source_url: 'https://www.liderpet.com.tr/reflex-plus-kitten-chicken',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.liderpet.com.tr/reflex-plus-kitten-chicken', verification_status: 'verified' }
    ]
  },

  // 25. Brit Care Cat Grain-Free Sterilized Fresh Rabbit
  {
    brand_normalized_name: 'britcare',
    official_name: 'Grain-Free Sterilized Tavşanlı Kısır Kedi Maması',
    normalized_name: 'grainfreesterilizedrabbit',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavşan Eti'],
    marketing_claims: ['Tahılsız', 'Böbrek ve İdrar Yolu Desteği'],
    source_url: 'https://brit-petfood.com/en/products/cats/479581-brit-care-cat-grain-free-sterilized-sensitive',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://brit-petfood.com/en/products/cats/479581-brit-care-cat-grain-free-sterilized-sensitive', verification_status: 'verified' },
      { gtin: null, package_size_grams: 7000, package_type: 'Torba', source_url: 'https://brit-petfood.com/en/products/cats/479581-brit-care-cat-grain-free-sterilized-sensitive', verification_status: 'verified' }
    ]
  },
  // 26. Brit Care Dog Sustainable Adult Medium Breed
  {
    brand_normalized_name: 'britcare',
    official_name: 'Sustainable Adult Medium Breed Köpek Maması',
    normalized_name: 'sustainableadultmediumdog',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk', 'Böcek Proteini'],
    marketing_claims: ['Sürdürülebilir İçerik', 'Anti-Stres Formül'],
    source_url: 'https://brit-petfood.com/en/products/dogs/brit-care-dog-sustainable-adult-medium-breed',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 3000, package_type: 'Torba', source_url: 'https://brit-petfood.com/en/products/dogs/brit-care-dog-sustainable-adult-medium-breed', verification_status: 'verified' },
      { gtin: null, package_size_grams: 12000, package_type: 'Torba', source_url: 'https://brit-petfood.com/en/products/dogs/brit-care-dog-sustainable-adult-medium-breed', verification_status: 'verified' }
    ]
  },

  // 27. Felicia Low Grain Sterilised Salmon
  {
    brand_normalized_name: 'felicia',
    official_name: 'Low Grain Sterilised Somonlu Kısır Kedi Maması',
    normalized_name: 'lowgrainsterilisedsalmon',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Somon', 'Hamsi'],
    marketing_claims: ['Düşük Tahıllı', 'Hipaoalerjenik'],
    source_url: 'https://www.feliciapets.com/low-grain-sterilised-somonlu',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://www.feliciapets.com/low-grain-sterilised-somonlu', verification_status: 'pending' },
      { gtin: null, package_size_grams: 12000, package_type: 'Torba', source_url: 'https://www.feliciapets.com/low-grain-sterilised-somonlu', verification_status: 'pending' }
    ]
  },
  // 28. Felicia Grain Free Puppy Lamb
  {
    brand_normalized_name: 'felicia',
    official_name: 'Grain Free Puppy Kuzu Etli Yavru Köpek Maması',
    normalized_name: 'grainfreepuppylamb',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Kuzu Eti'],
    marketing_claims: ['Tahılsız', 'Hassas Sindirim'],
    source_url: 'https://www.feliciapets.com/grain-free-puppy-lamb',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 3000, package_type: 'Torba', source_url: 'https://www.feliciapets.com/grain-free-puppy-lamb', verification_status: 'pending' }
    ]
  },

  // 29. Mystic Adult Cat Gourmet Food
  {
    brand_normalized_name: 'mystic',
    official_name: 'Adult Cat Gurme Gurme Kedi Maması',
    normalized_name: 'adultcatgourmet',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk', 'Kuzu Eti', 'Balık'],
    marketing_claims: ['Sıvılaştırılmış Taze Et Teknolojisi (FMIS)'],
    source_url: 'https://www.hermospet.com/mystic-adult-cat-gourmet',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 1500, package_type: 'Torba', source_url: 'https://www.hermospet.com/mystic-adult-cat-gourmet', verification_status: 'pending' },
      { gtin: null, package_size_grams: 15000, package_type: 'Torba', source_url: 'https://www.hermospet.com/mystic-adult-cat-gourmet', verification_status: 'pending' }
    ]
  },
  // 30. Mystic Puppy Medium & Large Lamb
  {
    brand_normalized_name: 'mystic',
    official_name: 'Puppy Medium & Large Kuzu Etli Yavru Köpek Maması',
    normalized_name: 'puppymediumlargelamb',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'growth',
    primary_proteins: ['Kuzu Eti', 'Pirinç'],
    marketing_claims: ['Taze Etli FMIS', 'Güçlü İskelet Desteği'],
    source_url: 'https://www.hermospet.com/mystic-puppy-lamb',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 2500, package_type: 'Torba', source_url: 'https://www.hermospet.com/mystic-puppy-lamb', verification_status: 'pending' },
      
    ]
  },

  // 31. BonaCibo Adult Cat Lamb & Rice
  {
    brand_normalized_name: 'bonacibo',
    official_name: 'Adult Cat Kuzu Etli ve Pirinçli Yetişkin Kedi Maması',
    normalized_name: 'bonaciboadultcatlamb',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Kuzu Eti', 'Pirinç'],
    marketing_claims: ['Optimal PH Dengesi', 'Tüy Yumak Kontrolü'],
    source_url: 'https://www.cagatay.com.tr/bonacibo-adult-cat-lamb',
    verification_status: 'verified',
    skus: [
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://www.cagatay.com.tr/bonacibo-adult-cat-lamb', verification_status: 'verified' },
      
    ]
  },

  // 32. Spectrum Adult Cat Hairball & Weight Control
  {
    brand_normalized_name: 'spectrum',
    official_name: 'Adult Cat Hairball & Weight Control Kedi Maması',
    normalized_name: 'spectrumhairballweight',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk'],
    marketing_claims: ['Tüy Yumağı Önleme', 'Kilo Yönetimi'],
    source_url: 'https://www.spectrumpetfood.com/spectrum-hairball',
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 2000, package_type: 'Torba', source_url: 'https://www.spectrumpetfood.com/spectrum-hairball', verification_status: 'pending' },
      
    ]
  },

  // 33. PENDING SAMPLE 1 (Retailer Source Only - Excluded from search API)
  {
    brand_normalized_name: 'enjoyretailer',
    official_name: 'Enjoy Adult Cat Gourmet (Perakendeci Taslağı)',
    normalized_name: 'enjoyadultcatgourmetpending',
    species: 'cat',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Tavuk'],
    marketing_claims: ['Perakendeci Kaynaklı'],
    source_url: null,
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 1000, package_type: 'Paket', source_url: null, verification_status: 'pending' }
    ]
  },
  // 34. PENDING SAMPLE 2 (Retailer Source Only - Excluded from search API)
  {
    brand_normalized_name: 'enjoyretailer',
    official_name: 'Enjoy Adult Dog Lamb & Rice (Perakendeci Taslağı)',
    normalized_name: 'enjoyadultdoglambpending',
    species: 'dog',
    food_form: 'dry',
    nutritional_role: 'complete',
    life_stage: 'adult',
    primary_proteins: ['Kuzu Eti'],
    marketing_claims: ['Perakendeci Kaynaklı'],
    source_url: null,
    verification_status: 'pending',
    skus: [
      { gtin: null, package_size_grams: 3000, package_type: 'Torba', source_url: null, verification_status: 'pending' }
    ]
  }
]
