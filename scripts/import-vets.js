const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Hata: SUPABASE_URL veya KEY eksik. .env.local dosyasını kontrol edin.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_URL = 'https://raw.githubusercontent.com/enderahmetyurt/veterinary-list/master/veterinary-list.json';

async function importVets() {
  console.log('⏳ Veriler GitHub üzerinden indiriliyor...');
  
  https.get(DATA_URL, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', async () => {
      try {
        const rawData = JSON.parse(body);
        console.log(`✅ ${rawData.length} adet klinik verisi alındı. Temizleme ve yükleme başlıyor...`);

        const formattedData = rawData.map(item => ({
          name: item.name,
          address: item.address === 'Belirtilmemiş' || item.address === '' ? null : item.address,
          city: item.city,
          district: item.town,
          contact_phone: item.telephone === 'Belirtilmemiş' || item.telephone === '' ? null : item.telephone,
          website: item.website || null,
          contact_email: item.email || null,
          is_public: true,
          tags: ['Genel']
        }));

        console.log('🚀 Veritabanına aktarım başlatılıyor (100\'erli paketler)...');

        // Toplu yükleme (Batch Insert)
        const batchSize = 100;
        let successCount = 0;
        
        for (let i = 0; i < formattedData.length; i += batchSize) {
          const batch = formattedData.slice(i, i + batchSize);
          const { error } = await supabase.from('clinics').insert(batch);
          
          if (error) {
            console.error(`❌ Hata (Batch ${i}):`, error.message);
          } else {
            successCount += batch.length;
            process.stdout.write(`\r🚀 İlerleme: ${successCount} / ${formattedData.length} yüklendi...`);
          }
        }

        console.log('\n\n🏁 İşlem başarıyla tamamlandı!');
        process.exit(0);
      } catch (e) {
        console.error('❌ Veri işleme hatası:', e.message);
        process.exit(1);
      }
    });
  }).on('error', (e) => {
    console.error('❌ İndirme hatası:', e.message);
    process.exit(1);
  });
}

importVets();
