# User Personas (Kullanıcı Profilleri)

Bu profiller, uygulamanın veritabanı şeması (`user_role` enum, `pet_owners` tablosu, `clinic_memberships` vb.) ve mevcut işlevlerinden doğrudan doğrulanarak çıkarılmıştır. 

## 1. Ana Pet Sahibi (Primary Pet Owner)
Uygulamanın merkezindeki birincil kullanıcı tipidir.
- **İhtiyaç:** Evcil hayvanının (kedi/köpek) aşı, beslenme, sağlık ve bakım süreçlerini tek bir yerden unutmadan takip edebilmek.
- **Problem:** Aşı tarihlerini unutmak, tıbbi geçmişi dağınık kağıtlarda veya eski veterinerlerde kaybetmek.
- **Hedef:** Tüm sağlık takvimini dijitalleştirerek "Auto-pilot" (otonom hatırlatıcı) rahatlığına erişmek.
- **Uygulamadaki Davranış:** Pet profili oluşturur, eski aşı karnesinin fotoğrafını çekip (OCR AI) veya manuel olarak aşıları sisteme girer. `health_schedules` ve `nutrition_plans` üzerinden bildirimleri açar.
- **Kritik Özellikler:** Pet Core, Sağlık Zaman Çizelgesi (Timeline), Aşı/Parazit Planlama, AI OCR, PWA/Push Bildirimleri.
- **Sürtünme (Friction) Noktaları:** Onboarding sırasında (Progressive Profiling ihlal edilip) çok fazla veri istenmesi durumunda uygulamayı terk etme riski.

## 2. Aile Üyesi / Ortak Sahip (Co-Owner / Family Member)
Mevcut `pet_owners` tablosundaki (Multi-Owner) destekten doğrulanmış persona.
- **İhtiyaç:** Eşiyle veya ev arkadaşıyla aynı evcil hayvanın bakım sorumluluğunu (kim mamasını verdi, kim aşıya götürecek) ortaklaşa yönetmek.
- **Problem:** Çift veri girişi veya iletişim kopukluğu nedeniyle aşı atlanması/çift mama verilmesi.
- **Hedef:** Petin tüm verilerine ve bildirimlerine ortak erişim sağlamak.
- **Uygulamadaki Davranış:** Ana sahip tarafından gönderilen davetle (`pet_owners` ilişkisi kurularak) pete erişim sağlar. Bildirimleri kendi cihazında da alır.
- **Kritik Özellikler:** Multi-Owner yetkilendirmesi, ortak Timeline, Paylaşımlı Plan/Görev yönetimi.

## 3. Klinik Personeli / Veteriner Hekim (Clinic Staff / Vet)
Veritabanındaki `user_role = 'clinic_staff'` ve `clinic_memberships` yapısından doğrulanmıştır.
- **İhtiyaç:** Kendilerine kayıtlı veya randevusu olan hastaların (petlerin) güncel tıbbi geçmişini, alerjilerini ve aşı takvimini görebilmek.
- **Problem:** Pet sahibinin eksik veya yanlış bilgi vermesi, hastanın geçmiş kliniğinden veri alınamaması.
- **Hedef:** Randevu öncesi hastanın tam dijital tıbbi geçmişine saniyeler içinde erişmek ve gerektiğinde `appointments` modülü üzerinden randevu yönetmek.
- **Uygulamadaki Davranış:** Sadece kendi kliniğiyle ilişkisi/randevusu olan (`appointments` tablosu üzerinden RLS ile sınırlandırılmış) petlerin profillerini (read-only veya yetkili) görüntüler.
- **Kritik Özellikler:** Clinic Dashboard, Appointments, Medical History (Health Core), Veteriner Doğrulaması (Vet Approval).
- **Sürtünme (Friction) Noktaları:** Eğer arayüz "tüketici/sosyal medya" uygulamasından çok "hasta takip yazılımı" (B2B) hissi vermiyorsa profesyoneller tarafından benimsenmeme riski.

## 4. Sosyal Kullanıcı ve Topluluk Üyesi (Community Member)
Veritabanındaki `social_posts` ve `lost_reports` tablolarından doğrulanmıştır.
- **İhtiyaç:** Evcil hayvanının sevimli anlarını paylaşmak veya acil durumlarda (kayıp pet vb.) çevredeki hayvanseverlere hızla ulaşmak.
- **Problem:** Diğer genel sosyal ağlarda (Instagram, Twitter) gönderilerin sadece ilgili/yerel hayvanseverlere ulaşmaması.
- **Hedef:** Kendi gibi hayvan sahipleriyle etkileşime girmek ve SOS (Kayıp) durumlarında dayanışma ağı yaratmak.
- **Uygulamadaki Davranış:** Peti adına gönderi (caption, image) oluşturur, "Floating SOS" butonunu kullanarak kayıp ihbarı başlatır.
- **Kritik Özellikler:** Social Feed, Kayıp İlanı (Lost Report / SOS), Bildirimler.

## 5. İlan ve Üretici Kullanıcısı (Marketplace / Breeder)
Veritabanındaki `breeding_listings` ve `breeding_applications` tablolarından doğrulanmıştır.
- **İhtiyaç:** Uygun sağlık ve ırk standartlarına sahip evcil hayvanlarını eşleştirmek veya sahiplendirmek.
- **Problem:** Güvenilmeyen, şeceresiz veya sağlık kontrolü yapılmamış hayvanlarla eşleşme riski.
- **Hedef:** Güvenilir, aşıları tam ve sağlık geçmişi dijital ortamda (Odi Pet içinde) doğrulanabilir profillerle iletişim kurmak.
- **Uygulamadaki Davranış:** Eşleştirme ilanları açar, gelen başvuruları (`breeding_applications`) değerlendirir, profillerin sağlık durumunu (`breeding_eligibility`) inceler.
- **Kritik Özellikler:** Breeding Marketplace, Seçilme ve Başvuru modülleri, Sağlık Bütünlük Doğrulaması (Health Integrity).
