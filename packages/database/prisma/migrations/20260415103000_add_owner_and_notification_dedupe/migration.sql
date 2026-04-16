-- AlterTable
ALTER TABLE "order"
ADD COLUMN "responsible_user_id" INTEGER,
ADD COLUMN "created_by_id" INTEGER;

-- AlterTable
ALTER TABLE "delivery_note"
ADD COLUMN "created_by_id" INTEGER;

-- AlterTable
ALTER TABLE "billing_statement"
ADD COLUMN "created_by_id" INTEGER;

-- AlterTable
ALTER TABLE "production_task"
ADD COLUMN "last_status_updated_by_id" INTEGER,
ADD COLUMN "last_status_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "system_notification"
ADD COLUMN "dedupe_key" VARCHAR(191);

-- CreateIndex
CREATE INDEX "order_responsible_user_id_idx" ON "order"("responsible_user_id");

-- CreateIndex
CREATE INDEX "order_created_by_id_idx" ON "order"("created_by_id");

-- CreateIndex
CREATE INDEX "delivery_note_created_by_id_idx" ON "delivery_note"("created_by_id");

-- CreateIndex
CREATE INDEX "billing_statement_created_by_id_idx" ON "billing_statement"("created_by_id");

-- CreateIndex
CREATE INDEX "production_task_last_status_updated_by_id_idx" ON "production_task"("last_status_updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_notification_user_id_dedupe_key_key" ON "system_notification"("user_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "order"
ADD CONSTRAINT "order_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order"
ADD CONSTRAINT "order_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_note"
ADD CONSTRAINT "delivery_note_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statement"
ADD CONSTRAINT "billing_statement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_task"
ADD CONSTRAINT "production_task_last_status_updated_by_id_fkey" FOREIGN KEY ("last_status_updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
