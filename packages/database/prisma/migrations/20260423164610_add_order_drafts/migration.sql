-- CreateTable
CREATE TABLE "order_draft" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER,
    "customer_name" VARCHAR(100),
    "responsible_user_id" INTEGER,
    "target_date" TIMESTAMP(3),
    "remark" VARCHAR(500),
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_draft_item" (
    "id" SERIAL NOT NULL,
    "draft_id" INTEGER NOT NULL,
    "part_id" INTEGER,
    "ordered_qty" INTEGER,
    "unit_price" DECIMAL(10,2),
    "price_label" VARCHAR(50),

    CONSTRAINT "order_draft_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_draft_customer_id_idx" ON "order_draft"("customer_id");

-- CreateIndex
CREATE INDEX "order_draft_responsible_user_id_idx" ON "order_draft"("responsible_user_id");

-- CreateIndex
CREATE INDEX "order_draft_created_by_id_idx" ON "order_draft"("created_by_id");

-- CreateIndex
CREATE INDEX "order_draft_updated_at_idx" ON "order_draft"("updated_at");

-- CreateIndex
CREATE INDEX "order_draft_item_draft_id_idx" ON "order_draft_item"("draft_id");

-- CreateIndex
CREATE INDEX "order_draft_item_part_id_idx" ON "order_draft_item"("part_id");

-- AddForeignKey
ALTER TABLE "order_draft" ADD CONSTRAINT "order_draft_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_draft" ADD CONSTRAINT "order_draft_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_draft" ADD CONSTRAINT "order_draft_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_draft_item" ADD CONSTRAINT "order_draft_item_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "order_draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_draft_item" ADD CONSTRAINT "order_draft_item_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE SET NULL ON UPDATE CASCADE;
