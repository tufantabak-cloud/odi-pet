# ODI.PET PRODUCTION MANUEL UAT (USER ACCEPTANCE TESTING) CHECKLIST

Bu doküman, **Odi.Pet** platformunun canlı ortam (Production) öncesinde gerçek kullanıcı deneyimi, iş mantığı doğruluğu, veri güvenliği ve arayüz kalitesi açısından **Tufan TABAK** tarafından manuel olarak test edilip değerlendirilmesi için hazırlanmıştır.

---

## 📌 MANUEL UAT KULLANIM REHBERİ

1. **Beklenen Sonuç:** Sistem gereksinimlerinden ve OPOS Design Bible standartlarından türetilmiş **objektif teknik ve fonksiyonel davranıştır.**
2. **Benim Gözlemim / Görüşüm (ZORUNLU MANUEL ALAN):** Test sırasında **tarafınızca doldurulacaktır**. Sadece teknik hatalar değil; arayüz rahatlığı, tıklama sayısı, metin anlaşılırlığı, buton belirginliği, hız hissi ve kişisel değerlendirmeleriniz buraya yazılmalıdır.
3. **Sonuç:** Test ettiğiniz maddenin durumuna göre `☐ PASS`, `☐ FAIL`, `☐ BLOCKED` veya `☐ N/A` kutucuklarından uygun olanı `☑` şeklinde değiştirebilir veya yanına yazabilirsiniz.
4. **Kanıt / Not:** Ekran görüntüsü ismi, sayfa URL'si veya karşılaşılan hata kodlarını ekleyebilirsiniz.
5. 💡 **İnteraktif Canlı Web Paneli (ÖNERİLEN):** Dokümanı tarayıcıda canlı renkli butonlar, otomatik kaydetme ve filtreleme ile kullanmak için projenizdeki [`PRODUCTION-MANUAL-UAT-CHECKLIST.html`](file:///c:/Odi.Pet/PRODUCTION-MANUAL-UAT-CHECKLIST.html) dosyasını çift tıklayarak tarayıcınızda açabilirsiniz!

---

## 1. KULLANICI GİRİŞİ, KAYIT VE KATILIM (AUTH & ONBOARDING)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| AUTH-001 | P0 | Ziyaretçi | Giriş yapılmamış ve geçerli e-posta adresine erişim var | `/register` sayfasına git → E-posta, şifre ve ad-soyad alanlarını doldur → "Kayıt Ol" butonuna tıkla | Kullanıcıya doğrulama e-postası / doğrulama kodu gönderildiğine dair onay bildirimi (Toast/Alert) gösterilir ve kullanıcı onboarding aşamasına yönlendirilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| AUTH-002 | P0 | Owner | Doğrulanmış üye hesabı mevcut | `/login` sayfasına git → Doğru e-posta ve şifre gir → "Giriş Yap" butonuna bas | Kullanıcı başarıyla doğrulanır, Supabase Auth oturum çerezi (session cookie) atanır ve doğrudan `/owner/dashboard` sayfasına yönlendirilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| AUTH-003 | P1 | Ziyaretçi | E-posta hesabı sistemde kayıtlı | `/reset-password` sayfasına git → Kayıtlı e-posta adresini yaz → "Şifre Sıfırlama Bağlantısı Gönder" butonuna bas | Şifre sıfırlama bağlantısı e-postaya ulaşır; gelen bağlantıya tıklandığında `/update-password` sayfasında yeni şifre belirlenip başarıyla güncellenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| AUTH-004 | P2 | Owner | Destekleyen mobil/web tarayıcı (WebAuthn/Passkey destekli) | Profil ayarlarından veya giriş ekranından Passkey / Biyometrik Giriş seçeneğini aktifleştir → Giriş yapmayı dene | Biyometrik tarama (FaceID/Fingerprint) veya cihaz şifresi ile şifresiz hızlı giriş başarıyla tamamlanır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| AUTH-005 | P0 | Owner | Kullanıcı oturumu açık | Sayfa üst barından veya profil menüsünden "Çıkış Yap" butonuna bas | Oturum sonlandırılır, auth token'ları temizlenir ve kullanıcı güvenli bir şekilde `/login` sayfasına yönlendirilir. Korumalı sayfalara geriye basarak erişilemez. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 2. EVCİL HAYVAN YÖNETİMİ VE PROFİL (PET MANAGEMENT)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| PET-001 | P0 | Owner | Kullanıcı giriş yapmış | `/owner/pets/add` ekranını aç → 7 temel alanı (Tür: Kedi/Köpek, İsim, Doğum Tarihi/Yaş, Cinsiyet, Kısırlaştırma Durumu, Kilo, Irk) eksiksiz gir → Kaydet | Pet kaydı kanonik veritabanına eklenir. Yaş grubuna göre yaş skalası rozeti (Yavru: 0-1, Yetişkin: 1-7, Yaşlı: 7-12, Yaşlı 12+) doğru hesaplanır ve pet listesinde anında görünür. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| PET-002 | P0 | Owner | En az 1 pet eklenmiş | Pet kartına veya `/owner/pets/[id]` sayfasına tıkla → Pet detay ekranını aç | OPOS Design Bible standartlarına uygun 24px radius, Pet Hero Card, Plus Jakarta Sans tipografi, tür etiketi, cinsiyet/kısırlaştırma rozetleri ve kapak alanı kusursuz şekilde yüklenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| PET-003 | P1 | Owner | Pet profili mevcut | `/owner/pets/[id]/edit` ekranını aç → Pet adını veya doğum tarihini güncelle, yeni profil fotoğrafı yükle → Değişiklikleri Kaydet | Fotoğraf Private Storage ortamına yüklenir, signed URL üzerinden görüntülenir; güncellenen bilgiler hem pet detay sayfasında hem de header/dashboard alanlarında senkronize olur. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| PET-004 | P1 | Owner | Pet profili mevcut | Pet detayında QR / Künye butonuna bas | Pete özel benzersiz QR kod ve çip numarası bilgisi görüntülenir. QR kod okutulduğunda petin kamuya açık acil durum künye sayfasına yönlendirir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| PET-005 | P2 | Owner | Sahip olunan pet mevcut | Pet ayarlarından "Peti Arşivle / Pasife Al" seçeneğini seç ve onayla | Pet ana listeden kaldırılır, ancak tıbbi geçmiş ve kanonik veriler silinmeyip arşiv statüsüne (`is_archived = true`) alınır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| PET-006 | P0 | Owner | Birden fazla pet tanımlı | Dashboard üst alanından veya pet değiştiriciden (Pet Switcher) farklı bir pet seç | Tüm dashboard verileri (aşılar, parazitler, beslenme, takvim) seçilen petin kanonik verilerine göre anında güncellenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 3. AŞI VE MEDİKAL GEÇMİŞ (HEALTH & VACCINES - OPOS CANONICAL & ARCHIVAL)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| VAC-001 | P0 | Owner | En az bir pet mevcut | `/owner/pets/[id]/vaccines` sayfasını aç → "Yeni Aşı Ekle" butonuna bas → Karma Aşı seç, Uygulama Tarihi ve Gelecek Doz Tarihi gir → Kaydet | Aşı kaydı `pet_vaccines` kanonik tablosuna eklenir; aşı kartı "Tamamlandı" durumuna geçer, gelecek doz tarihi otomatik olarak `/owner/takvim` sayfasına yansır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| VAC-002 | P0 | Owner | En az bir aşı kaydı var | Aşı geçmişinde bir aşı kaydı seç → "Sil / Kaldır" butonuna bas ve çıkan modalı onayla | **Hard Delete yapılmaz.** Veritabanında `is_archived = true` işaretlenir, arayüzde görünmez ancak petin tıbbi geçmiş bütünlüğü veritabanında muhafaza edilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| VAC-003 | P1 | Owner | Gelecek tarihli aşı tanımı var | Dashboard ve Takvim sayfasını kontrol et | Yaklaşan aşı için kalan gün sayısına göre sarı/turuncu "Yaklaşıyor" rozeti gösterilir; zamanı geldiğinde bildirim alanında uyarı kartı oluşur. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| VAC-004 | P1 | Owner | Aşı karne fotoğrafı mevcut | Aşı ekleme formunda "Aşı Belgesi / Karne Fotoğrafı Yükle" alanına dosya seç → Kaydet | Dosya Supabase Private Storage bucket'ına yüklenir. İstemci tarafına yalnızca süreli Signed URL (`createSignedUrl`) döndürülür, raw CDN linki sızmaz. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| VAC-005 | P2 | Owner | Aşı geçmişi mevcut | Aşı listesinde tür filtresi (Karma, Kuduz, Mantar vb.) kullan veya arama yap | Liste anında filitrelenir, eşleşmeyen kayıtlar gizlenir; arama temizlendiğinde tüm aşılar tekrar listelenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 4. PARAZİT VE İLAÇ TAKİBİ (PARASITES & MEDICATIONS)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| MED-001 | P0 | Owner | Pet mevcut | `/owner/pets/[id]/parasite` sayfasına git → "İç/Dış Parazit Uygulaması Ekle" seç → İlaç adı, uygulama tarihi ve periyot (Örn: 2 Ayda Bir) seçip kaydet | Parazit uygulaması kanonik tabloya kaydedilir. Bir sonraki uygulama tarihi otomatik hesaplanıp takvime ve hatırlatıcı paneline eklenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| MED-002 | P1 | Owner | Pet mevcut | `/owner/pets/[id]/treatments` sayfasına git → "Tedavi / İlaç Ekle" seç → İlaç adı, günlük dozaj ve kullanım süresi (gün) gir → Kaydet | İlaç takibi başlatılır, günlük doz hatırlatmaları aktif hale gelir ve petin sağlık geçmişi zaman çizelgesinde (Timeline) görüntülenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| MED-003 | P1 | Owner | Süresi dolmuş parazit uygulaması mevcut | Tarihi geçmiş bir parazit uygulaması olan pet ile dashboard'u aç | Kırmızı renkte "Gecikti / Süresi Doldu" aciliyet rozeti ve uyarısı gösterilir; kullanıcıyı hızlıca yeni kayıt eklemeye yönlendirir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| MED-004 | P2 | Owner | Tamamlanmış tedavi mevcut | Aktif tedaviyi "Tamamlandı" olarak işaretle | Tedavi aktif listeden geçmiş tedaviler alanına kaydırılır, kalan doz hatırlatmaları pasifize edilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 5. BESLENME VE KİLO TAKİBİ (NUTRITION & WEIGHT GROWTH)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| NUT-001 | P0 | Owner | Pet mevcut | `/owner/pets/[id]/nutrition` sayfasına git → Kuru Mama markası, günlük gramaj (Örn: 180g) ve öğün sayısı gir → Kaydet | Beslenme planı kaydedilir, öğün saatleri ve porsiyon önerisi kart üzerinde görselleştirilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| NUT-002 | P1 | Owner | Beslenme tanımı var | Mama değiştirme veya Alerjen Ekle butonuna bas → Hassasiyet / Alerji bilgisi gir | Mama hassasiyeti ve alerjen bilgisi profilde uyarı rozeti olarak dondurulur; beslenme tavsiyelerinde dikkate alınır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| WGT-001 | P0 | Owner | Pet mevcut | Pet detayından veya FAB menüsünden "+ Kilo Ekle" seç → Güncel kilo (Örn: 4.5 kg) ve ölçüm tarihi gir → Kaydet | Kilo kaydı eklenir, kilo değişim grafiği (Growth Chart) güncellenir. Petin türüne ve yaşına göre ideal kilo aralığı bandı doğru görüntülenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| WGT-002 | P2 | Owner | En az 2 kilo kaydı mevcut | Kilo grafiğini incele ve zaman aralığı filtresini (1 Ay, 6 Ay, 1 Yıl) değiştir | Grafik seçilen zaman aralığına göre dinamik olarak ölçeklenir, kilo artış/azalış yüzdesi ve trend oku doğru gösterilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 6. TAKVİM VE HATIRLATICILAR (CALENDAR & REMINDERS)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| CAL-001 | P0 | Owner | Aşı, parazit veya randevu kaydı tanımlı | `/owner/takvim` sayfasına git → Ay ve Hafta görünümlerini kontrol et | Tüm kanonik modüllerden (Aşı, Parazit, Muayene, Etkinlik) gelen yaklaşan işlemler renkli durum noktaları ve kartlarla doğru tarihlerde listelenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| CAL-002 | P1 | Owner | Oturum açık | Takvim ekranından "+ Özel Etkinlik / Hatırlatıcı Ekle" seç → Başlık (Örn: Kuaför Randevusu), Tarih ve Saat gir → Kaydet | Özel etkinlik takvime eklenir, zamanı geldiğinde bildirim merkezine ve mobil push bildirim mekanizmasına tetikleyici düşer. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| CAL-003 | P2 | Owner | Birden fazla türde etkinlik var | Takvim üstündeki kategori filtre çiplerini (Aşı, Parazit, Randevu, Bakım) değiştir | Yalnızca seçili kategoriye ait etkinlikler takvim üzerinde kalır, diğerleri gizlenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| CAL-004 | P1 | Owner | Tamamlanmamış hatırlatıcı var | Takvimdeki bir hatırlatıcı kartına bas → "Tamamlandı Olarak İşaretle" seçeneğini seç | Etkinlik durumu "Tamamlandı" olarak güncellenir, dikey timeline çizgisi üzerinde yeşil onay ikonu belirir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 7. AI VETERİNER VE OCR TARAMA (AI ASSISTANT & OCR - OPOS CİLT 13)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| AIV-001 | P0 | Owner | Oturum açık | `/owner/ai-vet` asistan sayfasını aç → Pet semptomu sor (Örn: "Kedim bugün iştahsız ve halsiz, ne yapmalıyım?") | Tüm AI yanıtında mor **Sparkles (Mor Yıldız)** ikonu yer alır; yanıt altında zorunlu **Tıbbi Sorumluluk Reddi (Medical Disclaimer)** ibaresi açıkça görünür. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| AIV-002 | P0 | Owner | AI Asistan aktif | AI asistanına "Kedime bugün Karma-1 aşısı yaptırdım, kaydet" komutunu ver | **AI doğrudan veritabanına kayıt YAPAMAZ.** Kullanıcıya bir "Taslak İnceleme ve Onay Kartı" (Draft Review UI) sunulur. Kullanıcı "Onayla ve Kaydet" butonuna basmadan veritabanı değişmez. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| AIV-003 | P1 | Owner | Okunabilir aşı karnesi / tahlil fotoğrafı mevcut | `/owner/scanner` sayfasına git → Aşı karnesi fotoğrafı yükle ve OCR taramayı başlat | Görsel analiz edilir, bulunan aşı adı ve tarih bilgileri güven skoru (Confidence Score %85 vb.) ve açıklanabilirlik metni ile kullanıcının onayına sunulur. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| AIV-004 | P2 | Owner | Düşük kaliteli / bulanık belge mevcut | `/owner/scanner` ekranında okunaksız bir belge yükle | Sistem düşük güven skoru uyarısı verir ("Güven Skoru %60 altında. Lütfen verileri manuel doğrulayınız") ve alanları elle düzenleme imkanı sağlar. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 8. ACİL DURUM VE KAYIP İLANI (EMERGENCY & SOS)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| SOS-001 | P0 | Owner / Ziyaretçi | Oturum açık veya kapalı | Ana navigasyondaki kırmızı SOS butonuna tıklayarak `/sos` sayfasına git | Acil veteriner hattı, en yakın nöbetçi klinikler ve kayıp bildirim butonları dikkat çekici, yüksek kontrastlı ve gecikmesiz olarak yüklenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SOS-002 | P0 | Owner | Pet profili mevcut | `/owner/lost-report` ekranından kayıp pet seç → Kaybolduğu konum, zaman ve iletişim bilgilerini girip "Kayıp İlanı Yayınla" butonuna bas | Kayıp ilanı oluşturulur, kamuya açık kayıp haritasına düşer ve yakındaki topluluk üyelerine acil uyarı bildirimi gönderilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SOS-003 | P1 | Ziyaretçi / Herkes | Public QR kod okutuldu | Kayıp bir petin tasmasındaki QR kodu bir telefon kamerasıyla tara | Pete ait sahibinin belirlediği acil iletişim bilgileri ve "Bulundu Bildirimi Gönder" buotnu içeren kamuya açık profil sayfası açılır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 9. VETERİNER BULMA VE HİZMETLER (VETS, SERVICES & BOOKING)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| SRV-001 | P1 | Owner | Konum izni verilmiş veya şehir seçilmiş | `/owner/vets` sayfasına git → Harita veya Liste görünümünü seç, "Açık / Nöbetçi" filtresini aktif et | En yakın veteriner klinikleri mesafeye göre sıralanır, çalışma saatleri ve iletişim detayları doğru şekilde gösterilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SRV-002 | P1 | Owner | Seçili veteriner kliniği mevcut | Klinik detayından "Randevu Al" butonuna bas → Pet seç, Hizmet türü (Aşı/Muayene), Tarih ve Saat seçip randevu talebi gönder | Randevu talebi oluşturulur, randevularım (`/owner/bookings`) listesine "Onay Bekliyor" statüsünde eklenir ve kliniğe bildirim gider. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SRV-003 | P2 | Owner | Hizmet arama ekranı | `/owner/services` veya `/owner/marketplace` sayfasına git → Pet Oteli / Groomer / Sitter kategorilerini filtrele | İlgili kategorideki hizmet sağlayıcılarının profil kartları, puanları ve hizmet paketleri sorunsuz listelenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SRV-004 | P3 | Owner | Mağaza kataloğu mevcut | Marketplace sekmesinde mama veya pet aksesuarı arat | Ürün detayları, fiyatlar ve mağaza yönlendirme linkleri sorunsuz çalışır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 10. TOPLULUK VE PAYLAŞIM (SOCIAL & COMMUNITY)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| SOC-001 | P2 | Owner | Oturum açık | `/owner/social` akışını aç → Metin yaz, fotoğraflı gönderi ekle ve "Paylaş" butonuna bas | Gönderi topluluk akışında anında yayınlanır, gönderi üzerinde kullanıcı adı ve petin profili doğru eşleşir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SOC-002 | P2 | Owner | Akışta gönderi mevcut | Bir gönderiye beğeni (pati) ver ve yorum yaz | Beğeni sayısı anında güncellenir (`active:scale-[0.98]` micro animation hissedilir), yorum gönderi altına eklenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SOC-003 | P3 | Owner | Diğer pet profilleri mevcut | Bir pet profiline tıkla → "Takip Et" butonuna bas | Takip ilişkisi kurulur, petin paylaşımları kişisel akışta görünmeye başlar. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 11. AİLE VE İZİNLER (FAMILY, CO-OWNER & CAREGIVER ROLES)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| FAM-001 | P1 | Owner | Pet sahibi | `/owner/pets/[id]/share` veya FamilyTab ekranına git → "Eş-Sahip Davet Et (Co-Owner)" seç → E-posta girip davet gönder | Davet bağlantısı oluşturulur. Davet edilen kullanıcı kabul ettiğinde pet profili üzerinde tam erişim (güncelleme/ekleme) yetkisi kazanır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| FAM-002 | P1 | Owner | Pet sahibi | FamilyTab ekranından "Bakıcı Davet Et (Caregiver)" seç → Sadece okuma/beslenme işaretleme yetkisi ver | Bakıcı rolündeki kullanıcı petin hassas sahiplik ayarlarını değiştiremez, ancak günlük beslenme ve ilaç kayıtlarını görebilir/girebilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| FAM-003 | P2 | Owner | Eş-sahip tanımlı | Pet ayarlarından ekli bir eş-sahibin yetkisini kaldır veya pasife al | İlgili kullanıcının pet üzerindeki yetkisi anında iptal edilir ve pet listesinden düşer. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 12. HİZMET SAĞLAYICI VE KLİNİK PANELLERİ (PROVIDER DASHBOARDS)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| PRO-001 | P1 | Veteriner (Vet) | Vet rolüyle giriş yapılmış | `/clinic` veya veteriner paneline git → Gelen randevu taleplerini incele → "Onayla" veya "Saati Değiştir" butonuna bas | Randevu durumu güncellenir, pet sahibine onay ve randevu saati bildirimi otomatik iletilir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| PRO-002 | P2 | Pet Otel / Groomer / Sitter | İlgili profesyonel rolde giriş yapılmış | `/hotel`, `/groomer` veya `/sitter` paneline git → Hizmet fiyatlarını ve müsaitlik takvimini güncelle | Hizmet sağlayıcı profili güncellenir, kullanıcı tarafındaki aramalarda yeni fiyat ve müsaitlik verileri görüntülenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| PRO-003 | P1 | Veteriner (Vet) | Tamamlanan muayene | Hasta pet profiline resmi muayene/aşı notu ekle ve onayla | Eklenen muayene notu petin kanonik tıbbi geçmişine eklenir ve pet sahibinin sağlık kartına dikey timeline akışında yansır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 13. YÖNETİM PANELİ VE VERİ DOĞRULAMA (ADMIN PANEL & GOVERNANCE)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| ADM-001 | P1 | Admin / Founder | Admin rolüne sahip e-posta ile giriş yapılmış | `/admin` paneline git → Kullanıcı, pet, aşı ve aktif oturum metriklerini incele | Genel sistem istatistikleri, Supabase RLS durumu ve aktif platform özeti gecikmesiz olarak görüntülenir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| ADM-002 | P2 | Admin / Founder | Bekleyen AI makale / bilgi kartı mevcut | Admin panelinde AI İçerik Doğrulama (Human Source Verification) sekmesine git → Kaynağı doğrula ve "Yayınla" butonuna bas | Gerçek insan admin onayı gerçekleşir; audit loglarına `actor_role: admin` kaydedilir ve bilgi kartı canlıya alınır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| ADM-003 | P3 | Admin / Founder | Yetkisiz erişim denemesi yapılmış | Admin güvenlik logları (Audit Trail) sekmesini incele | Yetkisiz RLS erişimleri veya kural ihlali denemeleri tarih ve IP detaylarıyla log listesinde görünür. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## 14. MOBİL UX, PERFORMANS VE GÜVENLİK (MOBILE UX, PWA & SECURITY)

| ID | Öncelik | Kullanıcı / Rol | Ön Koşul | Kullanıcı Aksiyonu | Beklenen Sonuç | Benim Gözlemim / Görüşüm | Sonuç | Kanıt / Not |
| -- | ------- | --------------- | -------- | ------------------ | -------------- | ------------------------ | ----- | ----------- |
| MOB-001 | P0 | Owner | Mobil görünüm (375px - iPhone SE / Android) | Mobil cihazda veya Chrome DevTools responsive modunda (375px) tüm sekmeler arasında gezin | Bottom Navigation sabit kalır, dokunma alanları minimum 44x44px'tir, yatay kayma (horizontal overflow) oluşmaz, 24px radius tasarımlar tam oturur. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| MOB-002 | P1 | Owner | Cihaz ağ bağlantısı kesildi | İnternet bağlantısını kapatıp uygulamayı yenile veya gezin | PWA çevrimdışı (offline) durum uyarısı ve önbelleğe alınmış son pet verileri gösterilir; kırık sayfa (500/unhandled crash) verilmez. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SEC-001 | P0 | Owner / Hacker | Başka bir kullanıcının pet id'si biliniyor | Doğrudan URL satırına başka bir kullanıcının pet detay URL'sini (`/owner/pets/[baskasinin-id]`) yaz ve gitmeyi dene | **Supabase RLS engeline takılır.** Sayfa 404/403 veya yetkisiz erişim uyarısı verir, veri sızmaz. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SEC-002 | P0 | Ziyaretçi | Giriş yapılmamış | Doğrudan `/owner/dashboard` veya `/admin` URL'sine gitmeyi dene | Middleware kullanıcıyı anında durdurur ve `/login?redirectTo=...` parametresi ile giriş ekranına yönlendirir. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |
| SEC-003 | P1 | Owner | Tarayıcı geliştirici araçları açık (Network Tab) | Medya yükleme ve tahlil belgesi indirme isteklerini incele | Gerçek dosya CDN linkinin gizlendiği, yalnızca kısa süreli geçici imzalı URL'lerin (`createSignedUrl`) üretildiği doğrulanır. | | ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A | |

---

## UAT Sonuç Özeti

| Öncelik | Toplam | PASS | FAIL | BLOCKED | N/A |
| ------- | -----: | ---: | ---: | ------: | --: |
| P0      |     16 |      |      |         |     |
| P1      |     15 |      |      |         |     |
| P2      |     10 |      |      |         |     |
| P3      |      5 |      |      |         |     |

---

## Manuel Kullanıcı Gözlemleri

### Genel Kullanıcı Deneyimi

...

### En Önemli Sorunlar

...

### Kullanıcıyı En Çok Zorlayan Noktalar

...

### Çok İyi Çalışan Noktalar

...

### Canlıya Çıkmadan Önce Düzeltilmesini İstediğim Noktalar

...

---

## FINAL MANUAL UAT SIGN-OFF

P0 kontrolleri:        ☐ Tamamlandı  
P1 kontrolleri:        ☐ Tamamlandı  
P2 kontrolleri:        ☐ Tamamlandı  
Güvenlik kontrolleri:  ☐ Tamamlandı  
Veri bütünlüğü:        ☐ Tamamlandı  
Mobile UX:             ☐ Tamamlandı  
Production Smoke Test: ☐ Tamamlandı  

Genel karar:

☐ PRODUCTION'A HAZIR  
☐ DÜZELTMELERDEN SONRA TEKRAR TEST EDİLECEK  
☐ PRODUCTION'A HAZIR DEĞİL  

**Test Eden:**  
Tufan TABAK  

**Tarih:**  
____ / ____ / 2026  

**İmza / Onay:**  
____________________________________  
