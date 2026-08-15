# Odi Pet — Comprehensive Database Model & Schema

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\06_DATA_MODEL.md`  
> **Kapsam:** Veritabanı Tabloları, Şemalar, İndeksler, RLS Politikaları ve RPC'ler  

---

## 1. Veritabanı Mimarisi Genel Bakış

Odi Pet veritabanı Supabase (PostgreSQL) üzerinde barındırılır. Tüm tablolar 3. Normal Form (3NF) standartlarına uygun olarak ilişkisel modellenmiştir. Veri bütünlüğü ve yetkilendirme PostgreSQL Row Level Security (RLS) politikaları ve saklı yordamlar (RPC) ile sağlanır.

---

## 2. Ana Tablo Şemaları ve İlişkileri

### 2.1 Identity & Ownership (Kimlik ve Sahiplik)

#### `profiles`
- `id`: `UUID` (PK, Auth.users.id referansı)
- `full_name`: `TEXT`
- `phone`: `TEXT`
- `avatar_url`: `TEXT`
- `user_role`: `ENUM ('pet_owner', 'clinic_staff', 'admin')`
- `created_at`: `TIMESTAMPTZ` (Default `NOW()`)

#### `pets` (Merkezi Entity)
- `id`: `UUID` (PK, Default `gen_random_uuid()`)
- `name`: `TEXT` (NOT NULL)
- `species`: `TEXT` (NOT NULL, CHECK `species IN ('cat', 'dog')`)
- `breed`: `TEXT`
- `gender`: `TEXT` (CHECK `gender IN ('male', 'female')`)
- `birth_date`: `DATE`
- `is_neutered`: `BOOLEAN` (Default `FALSE`)
- `microchip_number`: `TEXT` (UNIQUE NULLABLE)
- `avatar_url`: `TEXT`
- `is_archived`: `BOOLEAN` (Default `FALSE`)
- `created_at`: `TIMESTAMPTZ`

#### `pet_owners` (Multi-Owner Junction Table)
- `pet_id`: `UUID` (FK -> `pets.id` ON DELETE CASCADE)
- `user_id`: `UUID` (FK -> `profiles.id` ON DELETE CASCADE)
- `role`: `ENUM ('primary', 'co_owner', 'viewer')`
- `created_at`: `TIMESTAMPTZ`
- **PK:** `(pet_id, user_id)`

---

### 2.2 Preventive & Medical Health (Kanonik Sağlık Tabloları)

#### `vaccine_records_v2` (Kanonik Aşı Kayıtları)
- `id`: `UUID` (PK)
- `pet_id`: `UUID` (FK -> `pets.id`)
- `vaccine_name`: `TEXT` (NOT NULL)
- `brand_name`: `TEXT`
- `dose_number`: `INT`
- `administered_at`: `DATE` (NOT NULL)
- `next_due_date`: `DATE`
- `administered_by_vet`: `TEXT`
- `document_url`: `TEXT` (Private Storage Path)
- `is_archived`: `BOOLEAN` (Default `FALSE`)
- `created_at`: `TIMESTAMPTZ`

#### `parasite_records` (Kanonik Parazit Kayıtları)
- `id`: `UUID` (PK)
- `pet_id`: `UUID` (FK -> `pets.id`)
- `parasite_type`: `ENUM ('internal', 'external', 'combined')`
- `product_name`: `TEXT`
- `applied_at`: `DATE`
- `next_due_date`: `DATE`
- `is_archived`: `BOOLEAN`

#### `health_schedules` (Zamanlanmış Sağlık Planları)
- `id`: `UUID` (PK)
- `pet_id`: `UUID` (FK -> `pets.id`)
- `title`: `TEXT`
- `category`: `ENUM ('vaccine', 'parasite', 'medication', 'checkup', 'care')`
- `due_date`: `DATE` (NOT NULL)
- `status`: `ENUM ('upcoming', 'overdue', 'completed', 'cancelled')`
- `completed_at`: `TIMESTAMPTZ`

---

### 2.3 Nutrition & Physical (Beslenme ve Kilo)

#### `pet_food_assignments`
- `id`: `UUID` (PK)
- `pet_id`: `UUID` (FK -> `pets.id`)
- `brand_id`: `UUID`
- `food_name`: `TEXT`
- `daily_portion_grams`: `NUMERIC(6,2)`
- `bag_weight_grams`: `NUMERIC(8,2)`
- `started_at`: `DATE`

#### `pet_food_inventory`
- `id`: `UUID` (PK)
- `assignment_id`: `UUID` (FK -> `pet_food_assignments.id`)
- `current_stock_grams`: `NUMERIC(8,2)`
- `last_calculated_at`: `TIMESTAMPTZ`

#### `weight_logs`
- `id`: `UUID` (PK)
- `pet_id`: `UUID` (FK -> `pets.id`)
- `weight_kg`: `NUMERIC(4,2)` (NOT NULL)
- `logged_at`: `DATE`

---

### 2.4 System, Engagement & Notification

#### `notifications`
- `id`: `UUID` (PK)
- `user_id`: `UUID` (FK -> `profiles.id`)
- `pet_id`: `UUID` (FK -> `pets.id` NULLABLE)
- `title`: `TEXT`
- `body`: `TEXT`
- `is_read`: `BOOLEAN` (Default `FALSE`)
- `created_at`: `TIMESTAMPTZ`

#### `notification_jobs` (Cron Motoru İş Kuyruğu)
- `id`: `UUID` (PK)
- `idempotency_key`: `TEXT` (UNIQUE NOT NULL)
- `user_id`: `UUID`
- `scheduled_for`: `TIMESTAMPTZ`
- `payload`: `JSONB`
- `status`: `ENUM ('queued', 'processing', 'delivered', 'failed')`

---

## 3. Atomik RPC Saklı Yordamlar (PostgreSQL Procedures)

### `complete_recurring_plan_rpc`
- **Görevi:** Kullanıcı bir planı "Tamamlandı" olarak işaretlediğinde yarışı (race condition) önleyerek plan durumunu `completed` yapar, kanonik aşı/parazit kaydını atar ve varsa bir sonraki periyot tarihini (next due date) otomatik olarak hesaplayıp yeni bir `health_schedules` satırı ekler.

### `secure_category_neutral_rpc`
- **Görevi:** Multi-tenant RLS yetki kontrollerini tek bir veri tabanı çağrısında doğrular ve kullanıcının erişim hakkı olmayan kayıtların dışarı sızmasını engeller.

---

## 4. RLS Güvenlik Politikaları Özeti (Row Level Security)

1. `pets` Tablosu RLS:
   ```sql
   CREATE POLICY "Users can view owned or co-owned pets" ON pets
   FOR SELECT USING (
     auth.uid() IN (
       SELECT user_id FROM pet_owners WHERE pet_id = pets.id
     )
   );
   ```
2. `vaccine_records_v2` Tablosu RLS:
   ```sql
   CREATE POLICY "Users can view health records of their pets" ON vaccine_records_v2
   FOR SELECT USING (
     auth.uid() IN (
       SELECT user_id FROM pet_owners WHERE pet_id = vaccine_records_v2.pet_id
     )
   );
   ```
