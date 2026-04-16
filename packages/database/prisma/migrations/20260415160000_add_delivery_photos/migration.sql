-- CreateTable
CREATE TABLE "delivery_photo" (
  "id" SERIAL NOT NULL,
  "delivery_note_id" INTEGER NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_key" VARCHAR(255) NOT NULL,
  "file_type" VARCHAR(20) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "delivery_photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_photo_delivery_note_id_sort_order_idx" ON "delivery_photo"("delivery_note_id", "sort_order");

-- AddForeignKey
ALTER TABLE "delivery_photo"
ADD CONSTRAINT "delivery_photo_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
