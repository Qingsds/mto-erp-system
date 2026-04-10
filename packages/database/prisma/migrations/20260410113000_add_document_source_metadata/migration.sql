ALTER TABLE "document"
ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(50) NOT NULL DEFAULT 'BILLING',
ADD COLUMN IF NOT EXISTS "source_file_name" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "source_mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "created_by_id" INTEGER;

DO $$
BEGIN
  ALTER TABLE "document"
  ADD CONSTRAINT "document_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "user"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
