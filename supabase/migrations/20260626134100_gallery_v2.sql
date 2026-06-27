-- Add new columns to pet_gallery
ALTER TABLE "public"."pet_gallery"
ADD COLUMN "caption" text,
ADD COLUMN "taken_at" timestamp with time zone,
ADD COLUMN "category" text DEFAULT 'general',
ADD COLUMN "care_event_id" uuid REFERENCES "public"."pet_care_events"("id") ON DELETE SET NULL,
ADD COLUMN "vaccine_record_id" uuid REFERENCES "public"."vaccine_records"("id") ON DELETE SET NULL;

-- Set default category for existing records
UPDATE "public"."pet_gallery" SET "category" = 'general' WHERE "category" IS NULL;
