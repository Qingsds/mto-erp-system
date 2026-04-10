-- Align database schema produced by migrations with current Prisma schema.
-- This migration is intentionally additive/backfill-first to avoid runtime drift.

-- 1) Introduce enum used by "order"."status"
DO $$
BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PARTIAL_SHIPPED', 'SHIPPED', 'CLOSED_SHORT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add user table required by seal usage audit relation
CREATE TABLE IF NOT EXISTS "user" (
  "id" SERIAL NOT NULL,
  "username" VARCHAR(50) NOT NULL,
  "real_name" VARCHAR(50) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user"("username");

-- 3) Align part table columns
ALTER TABLE "part" ADD COLUMN IF NOT EXISTS "part_number" TEXT;
UPDATE "part"
SET "part_number" = CONCAT('PN-LEGACY-', LPAD("id"::text, 6, '0'))
WHERE "part_number" IS NULL;
ALTER TABLE "part" ALTER COLUMN "part_number" SET NOT NULL;

ALTER TABLE "part" ADD COLUMN IF NOT EXISTS "material" VARCHAR(100);
UPDATE "part"
SET "material" = '未标注材质'
WHERE "material" IS NULL;
ALTER TABLE "part" ALTER COLUMN "material" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "part_part_number_key" ON "part"("part_number");

-- 4) Align order table status/reason
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "reason" VARCHAR(100);
ALTER TABLE "order" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "order"
ALTER COLUMN "status" TYPE "OrderStatus"
USING (
  CASE "status"
    WHEN 'PENDING' THEN 'PENDING'::"OrderStatus"
    WHEN 'PARTIAL_SHIPPED' THEN 'PARTIAL_SHIPPED'::"OrderStatus"
    WHEN 'SHIPPED' THEN 'SHIPPED'::"OrderStatus"
    WHEN 'CLOSED_SHORT' THEN 'CLOSED_SHORT'::"OrderStatus"
    ELSE 'PENDING'::"OrderStatus"
  END
);
ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OrderStatus";

-- 5) Align order_item delivered/shipped naming
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_item'
      AND column_name = 'delivered_qty'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_item'
      AND column_name = 'shipped_qty'
  ) THEN
    ALTER TABLE "order_item" RENAME COLUMN "delivered_qty" TO "shipped_qty";
  END IF;
END $$;

ALTER TABLE "order_item" ALTER COLUMN "shipped_qty" SET DEFAULT 0;

-- 6) Match unique one-to-one billing relation
CREATE UNIQUE INDEX IF NOT EXISTS "billing_item_delivery_item_id_key" ON "billing_item"("delivery_item_id");

-- 7) Move document table from polymorphic target_type/target_id to explicit foreign keys
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "order_id" INTEGER;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "delivery_note_id" INTEGER;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "billing_id" INTEGER;

UPDATE "document"
SET "order_id" = "target_id"
WHERE "target_type" = 'ORDER' AND "order_id" IS NULL;

UPDATE "document"
SET "delivery_note_id" = "target_id"
WHERE "target_type" = 'DELIVERY' AND "delivery_note_id" IS NULL;

UPDATE "document"
SET "billing_id" = "target_id"
WHERE "target_type" = 'BILLING' AND "billing_id" IS NULL;

ALTER TABLE "document" DROP COLUMN IF EXISTS "target_type";
ALTER TABLE "document" DROP COLUMN IF EXISTS "target_id";

-- 8) Introduce seal_usage_log.document_id and backfill from legacy target pair
ALTER TABLE "seal_usage_log" ADD COLUMN IF NOT EXISTS "document_id" INTEGER;

UPDATE "seal_usage_log" AS log
SET "document_id" = (
  SELECT d."id"
  FROM "document" AS d
  WHERE (log."target_type" = 'ORDER' AND d."order_id" = log."target_id")
     OR (log."target_type" = 'DELIVERY' AND d."delivery_note_id" = log."target_id")
     OR (log."target_type" = 'BILLING' AND d."billing_id" = log."target_id")
  ORDER BY d."id" DESC
  LIMIT 1
)
WHERE log."document_id" IS NULL;

DO $$
DECLARE placeholder_doc_id INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM "seal_usage_log" WHERE "document_id" IS NULL) THEN
    INSERT INTO "document" ("file_name", "original_key", "status")
    VALUES ('LEGACY-PLACEHOLDER.pdf', 'legacy/placeholder/original.pdf', 'DRAFT')
    RETURNING "id" INTO placeholder_doc_id;

    UPDATE "seal_usage_log"
    SET "document_id" = placeholder_doc_id
    WHERE "document_id" IS NULL;
  END IF;
END $$;

ALTER TABLE "seal_usage_log" ALTER COLUMN "document_id" SET NOT NULL;
ALTER TABLE "seal_usage_log" DROP COLUMN IF EXISTS "target_type";
ALTER TABLE "seal_usage_log" DROP COLUMN IF EXISTS "target_id";

-- 9) Backfill legacy users referenced by seal logs before adding FK
INSERT INTO "user" ("id", "username", "real_name", "is_active")
SELECT DISTINCT
  log."user_id",
  CONCAT('legacy_user_', log."user_id"),
  CONCAT('历史用户', log."user_id"),
  false
FROM "seal_usage_log" AS log
LEFT JOIN "user" AS u
  ON u."id" = log."user_id"
WHERE u."id" IS NULL;

SELECT setval(
  pg_get_serial_sequence('"user"', 'id'),
  COALESCE((SELECT MAX("id") FROM "user"), 1)
);

-- 10) Add missing foreign keys
ALTER TABLE "document"
ADD CONSTRAINT "document_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "order"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document"
ADD CONSTRAINT "document_delivery_note_id_fkey"
FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_note"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document"
ADD CONSTRAINT "document_billing_id_fkey"
FOREIGN KEY ("billing_id") REFERENCES "billing_statement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seal_usage_log"
ADD CONSTRAINT "seal_usage_log_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seal_usage_log"
ADD CONSTRAINT "seal_usage_log_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "document"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
