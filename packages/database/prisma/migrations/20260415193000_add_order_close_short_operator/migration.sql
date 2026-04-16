-- AlterTable
ALTER TABLE "order"
ADD COLUMN "closed_short_by_id" INTEGER,
ADD COLUMN "closed_short_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "order_closed_short_by_id_idx" ON "order"("closed_short_by_id");

-- AddForeignKey
ALTER TABLE "order"
ADD CONSTRAINT "order_closed_short_by_id_fkey" FOREIGN KEY ("closed_short_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
