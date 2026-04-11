-- CreateTable
CREATE TABLE "customer" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255),
    "contact_name" VARCHAR(50),
    "contact_phone" VARCHAR(50),
    "invoice_info" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_part" (
    "customer_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_part_pkey" PRIMARY KEY ("customer_id","part_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_name_key" ON "customer"("name");

-- AlterTable
ALTER TABLE "order" ADD COLUMN "customer_id" INTEGER;

-- CreateIndex
CREATE INDEX "order_customer_id_idx" ON "order"("customer_id");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_part" ADD CONSTRAINT "customer_part_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_part" ADD CONSTRAINT "customer_part_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
