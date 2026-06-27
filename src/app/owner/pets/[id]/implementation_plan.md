# Subagent Ekibi Görev ve Kurulum Planı

Mevcut görevleri paralel olarak en hızlı ve güvenli şekilde tamamlamak için iki adet alt ajan (subagent) görevlendireceğim. Aynı dosyada çakışma olmaması için görevleri izole ettim.

## Görev Dağılımı

### 1. Subagent (Alerji Arayüzü Geliştiricisi)
- **Görev:** Alerji ekleme ve silme işlemleri için kullanıcı dostu bir arayüz bileşeni (`src/components/pets/AllergyManager.tsx`) oluşturmak.
- **Detaylar:** Hazırladığım `/api/pets/[id]/allergies` endpoint'ini kullanarak yeni alerji ekleme (trigger_name, symptoms, vb.) ve var olanları silme işlemlerini yönetecek.
- **Entegrasyon:** Bu bileşen daha sonra ana `PetDetailClient.tsx` dosyasına benim tarafımdan eklenecek.

### 2. Subagent (Kapak Fotoğrafı UI Geliştiricisi)
- **Görev:** Kapak fotoğrafı için istenen "Zoom ve Kaydırma" (Pan & Zoom) deneyimini yeniden inşa etmek.
- **Detaylar:** `PetDetailClient.tsx` içindeki kapak ayarlama (cover_position) mantığını, resmi fiziksel olarak kırpmadan sadece CSS değerleriyle (scale ve translate) kaydedecek şekilde güncelleyecek. Kullanıcı deneyiminin pürüzsüz olmasına odaklanacak.

## Gözetim ve Denetim (Benim Rolüm - Antigravity)
- Ajanların kod üretim sürecini takip edeceğim.
- İşleri bittiğinde yazdıkları kodları denetleyecek, "Premium MVP" ve "Mimari Bütünlük" kurallarımıza uyup uymadıklarını test edeceğim.
- Ajanlar işlerini tamamlayınca arayüz entegrasyonlarını yapıp size nihai raporu (Walkthrough) sunacağım.

> [!NOTE]
> Bu planı onayladığınızda her iki ajanı da eşzamanlı olarak arka planda çalışmaya başlatacağım ve sonuçları denetleyeceğim.
