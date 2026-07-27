CREATE TYPE "MergedOrderStatus" AS ENUM ('ACTIVE', 'DISSOLVED');

CREATE TABLE "merged_order" (
    "id" SERIAL NOT NULL,
    "merged_no" VARCHAR(30) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "remark" VARCHAR(500),
    "created_by_id" INTEGER NOT NULL,
    "status" "MergedOrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "merged_order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "merged_order_item" (
    "id" SERIAL NOT NULL,
    "merged_order_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merged_order_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merged_order_merged_no_key" ON "merged_order"("merged_no");
CREATE INDEX "merged_order_customer_id_idx" ON "merged_order"("customer_id");
CREATE INDEX "merged_order_created_by_id_idx" ON "merged_order"("created_by_id");
CREATE INDEX "merged_order_status_created_at_idx" ON "merged_order"("status", "created_at");
CREATE UNIQUE INDEX "merged_order_item_order_id_key" ON "merged_order_item"("order_id");
CREATE INDEX "merged_order_item_merged_order_id_idx" ON "merged_order_item"("merged_order_id");

ALTER TABLE "merged_order" ADD CONSTRAINT "merged_order_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merged_order" ADD CONSTRAINT "merged_order_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "merged_order_item" ADD CONSTRAINT "merged_order_item_merged_order_id_fkey"
  FOREIGN KEY ("merged_order_id") REFERENCES "merged_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merged_order_item" ADD CONSTRAINT "merged_order_item_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
