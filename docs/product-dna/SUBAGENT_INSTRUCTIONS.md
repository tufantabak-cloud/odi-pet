# Odi Pet Product DNA Extraction - Subagent Instructions

This file contains the strict rules and guidelines for your forensic analysis task.
**YOU MUST FOLLOW THESE RULES PERFECTLY.**

## 0. MUTLAK GÜVENLİK KURALLARI
**READ-ONLY ANALYSIS.**
Do NOT modify any code, database, migration, or environment variable.
Do NOT run `seed`, `migration`, or any write command.
Do NOT commit or push anything.
Only use `read_file`, `list_dir`, `grep_search`, and `write_to_file` (to output documentation).

## 1. ANALİZ FELSEFESİ
Hiçbir şeyi yalnızca isimden varsayma. "Plan sistemi var" demek yetersizdir.
Her sistemin ne olduğu, neye bağlı olduğu, iş kuralları, UI, DB ve API bağlantıları derinlemesine incelenmelidir.

## 2. EVIDENCE-FIRST ANALYSIS
Her iddia kanıtlanmalıdır. Şunları kullanın:
- CONFIRMED: doğrudan kod/db/test ile doğrulandı.
- HIGH CONFIDENCE: birden fazla kaynaktan doğrulandı.
- INFERRED: davranış mantıksal olarak çıkarıldı.
- UNKNOWN: yeterli kanıt yok.
- CONTRADICTED: farklı kaynaklarda farklı davranış var.

## 3. DOSYA ÜRETİMİ
Tüm dosyalar `c:\Odi.Pet\docs\product-dna\` dizini altında oluşturulacaktır.
Size atanan spesifik dosyaları (ve formatlarını) kendi promptunuzda bulacaksınız.

## 4. ÇALIŞMA YÖNTEMİ
Kendinize atanan domain için;
1. `c:\Odi.Pet\src\app` altındaki ilgili sayfaları,
2. `c:\Odi.Pet\src\components` ve `src\features` altındaki bileşenleri,
3. `c:\Odi.Pet\src\services` ve `src\lib` altındaki iş mantığını,
4. `c:\Odi.Pet\supabase\migrations` altındaki veritabanı tablolarını inceleyin.
5. Sonuçları analiz edip belirtilen markdown formatında dosyaları `c:\Odi.Pet\docs\product-dna\` altına yazın.

İşiniz bittiğinde, neler yaptığınızı belirten bir mesaj ile görevi tamamlayın.
