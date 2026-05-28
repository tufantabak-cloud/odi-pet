export interface BreedHealthInfo {
  breed: string;
  species: 'Dog' | 'Cat';
  risks: string[];
  description: string;
}

export const breedHealthData: Record<string, BreedHealthInfo> = {
  // --- KÖPEKLER ---
  'golden retriever': {
    breed: 'Golden Retriever',
    species: 'Dog',
    risks: ['Kalça Displazisi', 'Katarakt', 'Progressive Retinal Atrofi (PRA)', 'Bazı kanser türleri'],
    description: "Golden Retriever'larda eklem problemleri ve göz sağlığına dikkat edilmelidir. Veterinerinizle düzenli göz ve eklem muayenelerini konuşun."
  },
  'labrador retriever': {
    breed: 'Labrador Retriever',
    species: 'Dog',
    risks: ['Obezite', 'Kalça ve Dirsek Displazisi', 'Egzersize Bağlı Çöküş (EIC)'],
    description: "Labrador'lar kilo almaya çok müsaittir; diyet ve egzersiz dengesi çok önemlidir. Ayrıca eklem sağlığı düzenli kontrol edilmelidir."
  },
  'pug': {
    breed: 'Pug',
    species: 'Dog',
    risks: ['Brakisefalik Sendrom (Solunum Zorluğu)', 'Göz Enfeksiyonları', 'Cilt Kıvrımı Enfeksiyonları'],
    description: "Pug'lar düz yüz yapılarından dolayı sıcak havalarda ve egzersiz sırasında solunum sıkıntısı yaşayabilir. Göz ve cilt kıvrımları düzenli temizlenmelidir."
  },
  'french bulldog': {
    breed: 'French Bulldog',
    species: 'Dog',
    risks: ['Brakisefalik Sendrom', 'Omurga Problemleri (IVDD)', 'Alerjiler'],
    description: "French Bulldog'lar solunum problemlerine ve omurga rahatsızlıklarına yatkındır. Aşırı sıcaktan kaçınmalı ve kilo kontrolüne dikkat etmelisiniz."
  },
  'alman kurdu': {
    breed: 'Alman Kurdu',
    species: 'Dog',
    risks: ['Kalça Displazisi', 'Dejeneratif Miyelopati', 'Mide Dönmesi (GDV)'],
    description: "Alman Kurtlarında arka bacak güçsüzlüğü ve eklem sorunları yaygındır. Beslenme sonrası aşırı hareketten kaçınmak mide dönmesini önlemeye yardımcı olur."
  },
  'poodle': {
    breed: 'Kaniş (Poodle)',
    species: 'Dog',
    risks: ['Addison Hastalığı', 'Göz Hastalıkları (PRA)', 'Diş Taşı ve Diş Eti Hastalıkları'],
    description: "Kanişler özellikle diş problemlerine yatkındır; düzenli diş fırçalama önerilir. Ayrıca göz muayenelerini aksatmamak önemlidir."
  },
  'shih tzu': {
    breed: 'Shih Tzu',
    species: 'Dog',
    risks: ['Göz Ülserleri', 'Solunum Problemleri', 'Diş Hastalıkları'],
    description: "Shih Tzu'ların iri ve çıkık gözleri yaralanmaya ve kuruluğa çok müsaittir. Diş fırçalama rutini de sağlıkları için kritiktir."
  },
  'chihuahua': {
    breed: 'Chihuahua',
    species: 'Dog',
    risks: ['Diz Kapağı Çıkığı (Patellar Luksasyon)', 'Hipoglisemi (Düşük Kan Şekeri)', 'Kalp Kapakçık Hastalığı'],
    description: "Chihuahua'lar küçük cüsselerinden dolayı hipoglisemi riski taşır, öğün atlamamalıdırlar. Diz ve kalp sağlığı rutin olarak izlenmelidir."
  },
  'rottweiler': {
    breed: 'Rottweiler',
    species: 'Dog',
    risks: ['Çapraz Bağ Kopması (CCL)', 'Osteosarkom (Kemik Kanseri)', 'Kalça Displazisi'],
    description: "Rottweiler'lar güçlü yapılarına rağmen eklem ve bağ yaralanmalarına yatkındır. İdeal kiloda kalmaları eklem yükünü azaltacaktır."
  },
  'beagle': {
    breed: 'Beagle',
    species: 'Dog',
    risks: ['Obezite', 'Epilepsi', 'Kulak Enfeksiyonları'],
    description: "Beagle'ların sarkık kulakları nemi hapsederek enfeksiyonlara zemin hazırlayabilir; kulaklar düzenli temizlenmelidir. İştahları yüksektir, porsiyon kontrolü şarttır."
  },
  'yorkshire terrier': {
    breed: 'Yorkshire Terrier',
    species: 'Dog',
    risks: ['Portosistemik Şant (Karaciğer Sorunu)', 'Trakea Çökmesi', 'Diz Kapağı Çıkığı'],
    description: "Yorkie'lerin hassas nefes boruları (trakea) vardır, boyun tasması yerine göğüs tasması kullanılması önerilir."
  },

  // --- KEDİLER ---
  'british shorthair': {
    breed: 'British Shorthair',
    species: 'Cat',
    risks: ['Hipertrofik Kardiyomiyopati (HKM)', 'Polikistik Böbrek Hastalığı (PKD)', 'Obezite'],
    description: "British Shorthair'ler kilo almaya çok müsaittir. Genetik kalp ve böbrek rahatsızlıkları riski nedeniyle yıllık taramalar önemlidir."
  },
  'scottish fold': {
    breed: 'Scottish Fold',
    species: 'Cat',
    risks: ['Osteokondrodisplazi (Eklem ve Kıkırdak Hastalığı)', 'Polikistik Böbrek Hastalığı (PKD)', 'Kulak Enfeksiyonları'],
    description: "Scottish Fold'ların kıvrık kulaklarına sebep olan gen, vücuttaki diğer kıkırdak ve eklemleri de olumsuz etkiler. Hareketliliklerini gözlemlemelisiniz."
  },
  'siyam': {
    breed: 'Siyam',
    species: 'Cat',
    risks: ['Astım', 'Göz Hastalıkları', 'Diş Eti Hastalıkları'],
    description: "Siyam kedileri solunum yolu hassasiyetlerine ve astıma yatkındır. Ev içinde tozlu/dumanlı kedi kumu kullanımından kaçınılmalıdır."
  },
  'persian': {
    breed: 'İran Kedisi (Persian)',
    species: 'Cat',
    risks: ['Polikistik Böbrek Hastalığı (PKD)', 'Solunum Zorluğu', 'Göz Akıntısı ve Ülserleri'],
    description: "İran kedilerinin basık yüzleri solunum problemlerine ve kronik göz akıntılarına neden olur. Göz çevreleri günlük temizlenmelidir."
  },
  'maine coon': {
    breed: 'Maine Coon',
    species: 'Cat',
    risks: ['Hipertrofik Kardiyomiyopati (HKM)', 'Kalça Displazisi', 'Spinal Musküler Atrofi (SMA)'],
    description: "Büyük cüsseli Maine Coon'larda genetik kalp kası kalınlaşması (HKM) riski bulunur. Düzenli veteriner muayenelerinde kalp ritmi kontrol edilmelidir."
  },
  'tekir': {
    breed: 'Tekir / Melez',
    species: 'Cat',
    risks: ['Obezite', 'Diş Taşı (Tartar)', 'Üriner Sistem Problemleri (FLUTD)'],
    description: "Melez kediler genellikle çok sağlıklıdır ancak obezite ve susuzluğa bağlı idrar yolu problemleri yaygındır. Bol su içmeye teşvik edilmelidir."
  },
  'van kedisi': {
    breed: 'Van Kedisi',
    species: 'Cat',
    risks: ['Sağırlık (Özellikle mavi gözlülerde)', 'Güneş Yanığı (Beyaz tüyler)'],
    description: "Beyaz tüylü ve mavi gözlü kedilerde sağırlık riski yüksektir. Ayrıca kulak uçları ve burunları güneşe karşı hassastır."
  }
};

/**
 * Kullanıcının girdiği ırk adına göre en uygun sağlık verisini döndürür.
 */
export function getBreedHealthInfo(breedName: string | undefined | null): BreedHealthInfo | null {
  if (!breedName) return null;
  const normalized = breedName.toLowerCase().trim();

  // Tam eşleşme
  if (breedHealthData[normalized]) {
    return breedHealthData[normalized];
  }

  // Kısmi eşleşme araması
  for (const [key, value] of Object.entries(breedHealthData)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}
